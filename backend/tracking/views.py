from collections import Counter
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile
from programs.models import WorkoutProgram
from programs.serializers import WorkoutProgramSerializer
from workouts.models import WorkoutSession
from workouts.serializers import WorkoutSessionSerializer

from .models import BodyMeasurement, PersonalRecord
from .serializers import (
    BodyMeasurementSerializer,
    PersonalRecordSerializer,
    XPTransactionSerializer,
)
from .services import award_measurement_xp, calculate_streak, get_xp_summary


class PersonalRecordViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PersonalRecordSerializer

    def get_queryset(self):
        queryset = PersonalRecord.objects.filter(user=self.request.user).select_related(
            'exercise',
            'workout_session',
        )
        search = self.request.query_params.get('search', '').strip()
        exercise_id = self.request.query_params.get('exercise', '').strip()
        if search:
            queryset = queryset.filter(exercise_name__icontains=search)
        if exercise_id.isdigit():
            queryset = queryset.filter(exercise_id=exercise_id)
        return queryset


class BodyMeasurementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BodyMeasurementSerializer

    def get_queryset(self):
        queryset = BodyMeasurement.objects.filter(user=self.request.user)
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        measurement = serializer.save(user=self.request.user)
        award_measurement_xp(measurement)


class XPSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = get_xp_summary(request.user)
        summary['recent_transactions'] = XPTransactionSerializer(
            summary['recent_transactions'],
            many=True,
        ).data
        return Response(summary)


class StreakSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(calculate_streak(request.user))


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        weekly_sessions = list(
            WorkoutSession.objects.filter(
                user=user,
                status=WorkoutSession.Status.COMPLETED,
                completed_at__date__range=(week_start, week_end),
            ).prefetch_related('exercises__sets')
        )
        weekly_sets = [
            workout_set
            for session in weekly_sessions
            for exercise in session.exercises.all()
            for workout_set in exercise.sets.all()
            if workout_set.is_completed
        ]
        muscle_distribution = Counter(
            exercise.primary_muscle_name or 'Other'
            for session in weekly_sessions
            for exercise in session.exercises.all()
            for workout_set in exercise.sets.all()
            if workout_set.is_completed
        )
        total_volume = sum(
            (workout_set.weight * workout_set.reps for workout_set in weekly_sets),
            Decimal('0'),
        )

        recent_workouts = WorkoutSession.objects.filter(
            user=user,
            status=WorkoutSession.Status.COMPLETED,
        ).select_related('program', 'program_day').prefetch_related(
            'exercises__sets',
            'personal_records',
        )[:3]
        active_workout = WorkoutSession.objects.filter(
            user=user,
            status=WorkoutSession.Status.IN_PROGRESS,
        ).select_related('program', 'program_day').prefetch_related('exercises__sets').first()
        active_program = WorkoutProgram.objects.filter(
            user=user,
            is_active=True,
        ).prefetch_related(
            'days__exercises__exercise__primary_muscle',
            'days__exercises__exercise__equipment',
            'days__exercises__exercise__secondary_muscles',
        ).first()

        measurements = list(BodyMeasurement.objects.filter(user=user)[:2])
        latest_weight = float(measurements[0].body_weight_kg) if measurements else None
        weight_change = None
        if len(measurements) == 2:
            weight_change = float(measurements[0].body_weight_kg - measurements[1].body_weight_kg)

        recent_records = PersonalRecord.objects.filter(user=user).select_related(
            'exercise',
            'workout_session',
        )[:5]
        xp = get_xp_summary(user)

        return Response({
            'user_summary': {
                'display_name': profile.display_name or user.username,
                'weekly_workout_target': profile.weekly_workout_target,
                'weekly_workouts_completed': len(weekly_sessions),
                'preferred_weight_unit': profile.preferred_weight_unit,
                **calculate_streak(user),
                'xp': {
                    key: value for key, value in xp.items()
                    if key != 'recent_transactions'
                },
            },
            'active_program': (
                WorkoutProgramSerializer(active_program, context={'request': request}).data
                if active_program else None
            ),
            'active_workout': (
                WorkoutSessionSerializer(active_workout, context={'request': request}).data
                if active_workout else None
            ),
            'recent_workouts': WorkoutSessionSerializer(
                recent_workouts,
                many=True,
                context={'request': request},
            ).data,
            'weekly_summary': {
                'workouts_completed': len(weekly_sessions),
                'completed_sets': len(weekly_sets),
                'total_volume': float(total_volume),
                'training_duration_seconds': sum(
                    session.duration_seconds for session in weekly_sessions
                ),
                'muscle_group_distribution': [
                    {'name': name, 'sets': count}
                    for name, count in muscle_distribution.most_common()
                ],
            },
            'progress_summary': {
                'latest_body_weight_kg': latest_weight,
                'weight_change_kg': weight_change,
                'recent_records': PersonalRecordSerializer(recent_records, many=True).data,
            },
        }, status=status.HTTP_200_OK)
