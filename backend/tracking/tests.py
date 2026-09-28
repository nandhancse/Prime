from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from exercises.models import Equipment, Exercise, MuscleGroup
from workouts.models import WorkoutExercise, WorkoutSession, WorkoutSet

from .models import BodyMeasurement, PersonalRecord, XPTransaction
from .services import calculate_streak


User = get_user_model()


class TrackingApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('tracker', password='StrongPassword123')
        self.other_user = User.objects.create_user('other-tracker', password='StrongPassword123')
        muscle = MuscleGroup.objects.create(name='Glutes')
        equipment = Equipment.objects.create(name='Barbell')
        self.exercise = Exercise.objects.create(
            name='Barbell Hip Thrust',
            primary_muscle=muscle,
            equipment=equipment,
        )
        self.client.force_authenticate(self.user)

    def create_active_workout(self, weight='100.00', reps=8, all_sets=True):
        workout = WorkoutSession.objects.create(
            user=self.user,
            name='Record Session',
            program_name='Strength',
        )
        workout_exercise = WorkoutExercise.objects.create(
            workout_session=workout,
            exercise=self.exercise,
            exercise_name=self.exercise.name,
            primary_muscle_name='Glutes',
            planned_weight=weight,
            target_reps_min=6,
            target_reps_max=10,
            rest_seconds=90,
        )
        WorkoutSet.objects.create(
            workout_exercise=workout_exercise,
            set_number=1,
            weight=weight,
            reps=reps,
            is_completed=True,
        )
        WorkoutSet.objects.create(
            workout_exercise=workout_exercise,
            set_number=2,
            weight=weight,
            reps=reps if all_sets else 0,
            is_completed=all_sets,
        )
        return workout

    def complete(self, workout):
        return self.client.post(reverse('workout-complete', args=[workout.id]), {}, format='json')

    def test_completion_detects_weight_and_estimated_one_rep_max_records(self):
        workout = self.create_active_workout(weight='100.00', reps=10)

        response = self.complete(workout)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record_types = set(PersonalRecord.objects.filter(user=self.user).values_list('record_type', flat=True))
        self.assertIn(PersonalRecord.RecordType.HEAVIEST_WEIGHT, record_types)
        self.assertIn(PersonalRecord.RecordType.ESTIMATED_ONE_REP_MAX, record_types)
        estimated = PersonalRecord.objects.get(
            user=self.user,
            record_type=PersonalRecord.RecordType.ESTIMATED_ONE_REP_MAX,
        )
        self.assertEqual(float(estimated.record_value), 133.33)
        self.assertGreater(response.data['completion_summary']['xp_awarded'], 0)

    def test_identical_performance_does_not_create_duplicate_records(self):
        first = self.create_active_workout(weight='80.00', reps=8)
        self.complete(first)
        first_count = PersonalRecord.objects.filter(user=self.user).count()

        second = self.create_active_workout(weight='80.00', reps=8)
        response = self.complete(second)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(PersonalRecord.objects.filter(user=self.user).count(), first_count)
        self.assertEqual(response.data['completion_summary']['new_personal_records'], [])

    def test_personal_records_are_private(self):
        workout = self.create_active_workout()
        self.complete(workout)
        own_record = PersonalRecord.objects.filter(user=self.user).first()

        self.client.force_authenticate(self.other_user)
        list_response = self.client.get(reverse('personal-record-list'))
        detail_response = self.client.get(reverse('personal-record-detail', args=[own_record.id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data, [])
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_workout_xp_is_awarded_once_and_repeated_completion_is_rejected(self):
        workout = self.create_active_workout()

        first_response = self.complete(workout)
        transaction_count = XPTransaction.objects.filter(user=self.user).count()
        second_response = self.complete(workout)

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(XPTransaction.objects.filter(user=self.user).count(), transaction_count)
        self.assertEqual(
            XPTransaction.objects.filter(
                user=self.user,
                reason=XPTransaction.Reason.WORKOUT_COMPLETE,
            ).count(),
            1,
        )

    def test_cancelled_workout_awards_no_xp(self):
        workout = self.create_active_workout()

        response = self.client.post(reverse('workout-cancel', args=[workout.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(XPTransaction.objects.filter(user=self.user).exists())

    def test_weekly_target_xp_is_awarded_once(self):
        self.user.fitness_profile.weekly_workout_target = 2
        self.user.fitness_profile.save(update_fields=['weekly_workout_target'])

        self.complete(self.create_active_workout(weight='50.00', reps=5))
        self.complete(self.create_active_workout(weight='55.00', reps=5))

        self.assertEqual(
            XPTransaction.objects.filter(
                user=self.user,
                reason=XPTransaction.Reason.WEEKLY_TARGET,
            ).count(),
            1,
        )

    def test_create_and_edit_measurement_awards_daily_xp_once(self):
        payload = {'date': timezone.localdate(), 'body_weight_kg': '82.50', 'waist_cm': '84.00'}
        create_response = self.client.post(
            reverse('body-measurement-list'),
            payload,
            format='json',
        )
        measurement_id = create_response.data['id']
        update_response = self.client.patch(
            reverse('body-measurement-detail', args=[measurement_id]),
            {'body_weight_kg': '82.00'},
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            XPTransaction.objects.filter(
                user=self.user,
                reason=XPTransaction.Reason.BODY_MEASUREMENT,
            ).count(),
            1,
        )

    def test_measurement_validation_and_ownership(self):
        invalid_response = self.client.post(
            reverse('body-measurement-list'),
            {'date': timezone.localdate(), 'body_weight_kg': '-10'},
            format='json',
        )
        other_measurement = BodyMeasurement.objects.create(
            user=self.other_user,
            date=timezone.localdate(),
            body_weight_kg='70.00',
        )
        detail_response = self.client.get(
            reverse('body-measurement-detail', args=[other_measurement.id])
        )

        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body_weight_kg', invalid_response.data)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_dashboard_contains_only_current_users_data(self):
        BodyMeasurement.objects.create(
            user=self.other_user,
            date=timezone.localdate(),
            body_weight_kg='99.00',
        )
        response = self.client.get(reverse('dashboard-analytics'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['progress_summary']['latest_body_weight_kg'])
        self.assertEqual(response.data['recent_workouts'], [])


class StreakCalculationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('streak-user', password='StrongPassword123')

    def create_session(self, day, status_value=WorkoutSession.Status.COMPLETED):
        timestamp = timezone.make_aware(datetime.combine(day, time(hour=12)))
        return WorkoutSession.objects.create(
            user=self.user,
            name='Streak workout',
            status=status_value,
            started_at=timestamp - timedelta(hours=1),
            completed_at=timestamp,
        )

    def test_same_day_sessions_count_once_and_consecutive_days_accumulate(self):
        today = timezone.localdate()
        self.create_session(today - timedelta(days=2))
        self.create_session(today - timedelta(days=1))
        self.create_session(today)
        self.create_session(today)

        result = calculate_streak(self.user)

        self.assertEqual(result['current_streak'], 3)
        self.assertEqual(result['longest_streak'], 3)

    def test_one_day_gap_resets_current_but_retains_longest(self):
        today = timezone.localdate()
        self.create_session(today - timedelta(days=4))
        self.create_session(today - timedelta(days=3))
        self.create_session(today - timedelta(days=1))

        result = calculate_streak(self.user)

        self.assertEqual(result['current_streak'], 1)
        self.assertEqual(result['longest_streak'], 2)

    def test_multiple_day_gap_and_cancelled_workout_do_not_count(self):
        today = timezone.localdate()
        self.create_session(today - timedelta(days=5))
        self.create_session(today, WorkoutSession.Status.CANCELLED)

        result = calculate_streak(self.user)

        self.assertEqual(result['current_streak'], 0)
        self.assertEqual(result['longest_streak'], 1)

    def test_backdated_workout_recalculates_longest_streak(self):
        today = timezone.localdate()
        self.create_session(today - timedelta(days=3))
        self.create_session(today - timedelta(days=1))
        self.create_session(today)
        self.create_session(today - timedelta(days=2))

        result = calculate_streak(self.user)

        self.assertEqual(result['current_streak'], 4)
        self.assertEqual(result['longest_streak'], 4)
