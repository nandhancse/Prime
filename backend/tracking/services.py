from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Max, Sum
from django.utils import timezone

from accounts.models import UserProfile
from workouts.models import WorkoutSession

from .models import BodyMeasurement, PersonalRecord, XPTransaction


TWO_PLACES = Decimal('0.01')


def level_threshold(level):
    step = max(0, level - 1)
    return 50 * step * step + 200 * step


def get_xp_summary(user, recent_limit=8):
    total_xp = user.xp_transactions.aggregate(total=Sum('amount'))['total'] or 0
    level = 1
    while total_xp >= level_threshold(level + 1):
        level += 1
    current_threshold = level_threshold(level)
    next_threshold = level_threshold(level + 1)
    span = max(1, next_threshold - current_threshold)
    in_level = total_xp - current_threshold
    return {
        'total_xp': total_xp,
        'current_level': level,
        'xp_in_current_level': in_level,
        'xp_required_for_next_level': span,
        'progress_percentage': round((in_level / span) * 100, 1),
        'recent_transactions': user.xp_transactions.all()[:recent_limit],
    }


def award_xp(user, amount, reason, reference, workout=None, measurement=None):
    transaction, created = XPTransaction.objects.get_or_create(
        user=user,
        reference=reference,
        defaults={
            'amount': amount,
            'reason': reason,
            'workout_session': workout,
            'body_measurement': measurement,
        },
    )
    return transaction, created


def calculate_streak(user):
    completed_values = WorkoutSession.objects.filter(
        user=user,
        status=WorkoutSession.Status.COMPLETED,
        completed_at__isnull=False,
    ).values_list('completed_at', flat=True)
    dates = sorted({timezone.localdate(value) for value in completed_values})

    if not dates:
        return {'current_streak': 0, 'longest_streak': 0, 'last_workout_date': None}

    longest = 1
    running = 1
    for previous, current in zip(dates, dates[1:]):
        if current == previous + timedelta(days=1):
            running += 1
            longest = max(longest, running)
        else:
            running = 1

    today = timezone.localdate()
    last_date = dates[-1]
    if last_date not in {today, today - timedelta(days=1)}:
        current_streak = 0
    else:
        current_streak = 1
        cursor = last_date
        date_set = set(dates)
        while cursor - timedelta(days=1) in date_set:
            cursor -= timedelta(days=1)
            current_streak += 1

    return {
        'current_streak': current_streak,
        'longest_streak': longest,
        'last_workout_date': last_date,
    }


def _create_record_if_higher(
    *, workout, workout_exercise, record_type, value, reference, workout_set=None,
    weight=Decimal('0'), repetitions=0, filters=None,
):
    filters = filters or {}
    value = value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    previous = PersonalRecord.objects.filter(
        user=workout.user,
        exercise_id=workout_exercise.exercise_id,
        record_type=record_type,
        **filters,
    ).aggregate(value=Max('record_value'))['value']
    if previous is not None and value <= previous:
        return None

    record, created = PersonalRecord.objects.get_or_create(
        user=workout.user,
        reference=reference,
        defaults={
            'exercise_id': workout_exercise.exercise_id,
            'exercise_name': workout_exercise.exercise_name,
            'record_type': record_type,
            'record_value': value,
            'weight': weight,
            'repetitions': repetitions,
            'workout_set': workout_set,
            'workout_session': workout,
            'achieved_at': workout.completed_at or timezone.now(),
        },
    )
    return record if created else None


def detect_personal_records(workout):
    created_records = []
    workout_exercises = workout.exercises.select_related('exercise').prefetch_related('sets')

    for workout_exercise in workout_exercises:
        if not workout_exercise.exercise_id:
            continue
        completed_sets = [
            item for item in workout_exercise.sets.all()
            if item.is_completed and item.weight > 0 and item.reps > 0
        ]
        if not completed_sets:
            continue

        heaviest = max(completed_sets, key=lambda item: (item.weight, item.reps))
        record = _create_record_if_higher(
            workout=workout,
            workout_exercise=workout_exercise,
            record_type=PersonalRecord.RecordType.HEAVIEST_WEIGHT,
            value=heaviest.weight,
            weight=heaviest.weight,
            repetitions=heaviest.reps,
            workout_set=heaviest,
            reference=f'workout:{workout.id}:exercise:{workout_exercise.id}:heaviest',
        )
        if record:
            created_records.append(record)

        best_reps_by_weight = {}
        for item in completed_sets:
            key = item.weight
            if key not in best_reps_by_weight or item.reps > best_reps_by_weight[key].reps:
                best_reps_by_weight[key] = item
        for weight, item in best_reps_by_weight.items():
            record = _create_record_if_higher(
                workout=workout,
                workout_exercise=workout_exercise,
                record_type=PersonalRecord.RecordType.WEIGHT_REPS,
                value=Decimal(item.reps),
                weight=weight,
                repetitions=item.reps,
                workout_set=item,
                filters={'weight': weight},
                reference=(
                    f'workout:{workout.id}:exercise:{workout_exercise.id}:'
                    f'weight-reps:{weight}'
                ),
            )
            if record:
                created_records.append(record)

        best_one_rep_max_set = max(
            completed_sets,
            key=lambda item: item.weight * (Decimal('1') + Decimal(item.reps) / Decimal('30')),
        )
        estimated_one_rep_max = best_one_rep_max_set.weight * (
            Decimal('1') + Decimal(best_one_rep_max_set.reps) / Decimal('30')
        )
        record = _create_record_if_higher(
            workout=workout,
            workout_exercise=workout_exercise,
            record_type=PersonalRecord.RecordType.ESTIMATED_ONE_REP_MAX,
            value=estimated_one_rep_max,
            weight=best_one_rep_max_set.weight,
            repetitions=best_one_rep_max_set.reps,
            workout_set=best_one_rep_max_set,
            reference=f'workout:{workout.id}:exercise:{workout_exercise.id}:estimated-1rm',
        )
        if record:
            created_records.append(record)

        best_volume_set = max(completed_sets, key=lambda item: item.weight * item.reps)
        record = _create_record_if_higher(
            workout=workout,
            workout_exercise=workout_exercise,
            record_type=PersonalRecord.RecordType.SET_VOLUME,
            value=best_volume_set.weight * best_volume_set.reps,
            weight=best_volume_set.weight,
            repetitions=best_volume_set.reps,
            workout_set=best_volume_set,
            reference=f'workout:{workout.id}:exercise:{workout_exercise.id}:set-volume',
        )
        if record:
            created_records.append(record)

        exercise_volume = sum(
            (item.weight * item.reps for item in completed_sets),
            Decimal('0'),
        )
        record = _create_record_if_higher(
            workout=workout,
            workout_exercise=workout_exercise,
            record_type=PersonalRecord.RecordType.EXERCISE_VOLUME,
            value=exercise_volume,
            weight=Decimal('0'),
            repetitions=0,
            reference=f'workout:{workout.id}:exercise:{workout_exercise.id}:exercise-volume',
        )
        if record:
            created_records.append(record)

    return created_records


def award_workout_xp(workout, personal_records):
    awarded = []
    transaction, created = award_xp(
        workout.user,
        50,
        XPTransaction.Reason.WORKOUT_COMPLETE,
        f'workout:{workout.id}:complete',
        workout=workout,
    )
    if created:
        awarded.append(transaction)

    planned_sets = workout.exercises.filter(sets__is_extra=False).exists()
    incomplete_planned = workout.exercises.filter(
        sets__is_extra=False,
        sets__is_completed=False,
    ).exists()
    if planned_sets and not incomplete_planned:
        transaction, created = award_xp(
            workout.user,
            20,
            XPTransaction.Reason.ALL_SETS_COMPLETE,
            f'workout:{workout.id}:all-planned-sets',
            workout=workout,
        )
        if created:
            awarded.append(transaction)

    if personal_records:
        transaction, created = award_xp(
            workout.user,
            min(100, len(personal_records) * 20),
            XPTransaction.Reason.PERSONAL_RECORD,
            f'workout:{workout.id}:personal-records',
            workout=workout,
        )
        if created:
            awarded.append(transaction)

    profile, _ = UserProfile.objects.get_or_create(user=workout.user)
    workout_date = timezone.localdate(workout.completed_at)
    week_start = workout_date - timedelta(days=workout_date.weekday())
    week_end = week_start + timedelta(days=6)
    weekly_count = WorkoutSession.objects.filter(
        user=workout.user,
        status=WorkoutSession.Status.COMPLETED,
        completed_at__date__range=(week_start, week_end),
    ).count()
    iso_year, iso_week, _ = workout_date.isocalendar()
    if weekly_count >= profile.weekly_workout_target:
        transaction, created = award_xp(
            workout.user,
            75,
            XPTransaction.Reason.WEEKLY_TARGET,
            f'weekly-target:{iso_year}-{iso_week}',
            workout=workout,
        )
        if created:
            awarded.append(transaction)

    if calculate_streak(workout.user)['current_streak'] >= 7:
        transaction, created = award_xp(
            workout.user,
            100,
            XPTransaction.Reason.SEVEN_DAY_STREAK,
            'streak-achievement:7-days',
            workout=workout,
        )
        if created:
            awarded.append(transaction)

    return awarded


def award_measurement_xp(measurement):
    return award_xp(
        measurement.user,
        5,
        XPTransaction.Reason.BODY_MEASUREMENT,
        f'body-measurement:{measurement.date.isoformat()}',
        measurement=measurement,
    )


def get_previous_performance(user, exercise_ids, exclude_session_id=None):
    from workouts.models import WorkoutSet

    queryset = WorkoutSet.objects.filter(
        workout_exercise__workout_session__user=user,
        workout_exercise__workout_session__status=WorkoutSession.Status.COMPLETED,
        workout_exercise__exercise_id__in=exercise_ids,
        is_completed=True,
    ).select_related('workout_exercise__workout_session').order_by(
        'workout_exercise__exercise_id',
        '-workout_exercise__workout_session__completed_at',
        'set_number',
    )
    if exclude_session_id:
        queryset = queryset.exclude(workout_exercise__workout_session_id=exclude_session_id)

    latest_session_by_exercise = {}
    performance = defaultdict(list)
    for workout_set in queryset:
        exercise_id = workout_set.workout_exercise.exercise_id
        session_id = workout_set.workout_exercise.workout_session_id
        if exercise_id not in latest_session_by_exercise:
            latest_session_by_exercise[exercise_id] = session_id
        if latest_session_by_exercise[exercise_id] == session_id:
            performance[exercise_id].append({
                'weight': float(workout_set.weight),
                'reps': workout_set.reps,
            })
    return dict(performance)
