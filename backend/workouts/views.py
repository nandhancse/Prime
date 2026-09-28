from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from programs.models import ProgramDay
from .models import WorkoutExercise, WorkoutSession, WorkoutSet
from .serializers import WorkoutSessionSerializer, WorkoutSetSerializer


def session_queryset(user):
    return WorkoutSession.objects.filter(user=user).select_related(
        'program',
        'program_day',
    ).prefetch_related(
        'exercises__sets',
        'personal_records',
    )


class WorkoutSessionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkoutSessionSerializer

    def get_queryset(self):
        queryset = session_queryset(self.request.user)
        if self.action == 'list':
            requested_status = self.request.query_params.get('status', 'completed')
            if requested_status != 'all':
                queryset = queryset.filter(status=requested_status)
        return queryset.order_by('-started_at')

    @action(detail=False, methods=['get'])
    def active(self, request):
        active_session = session_queryset(request.user).filter(
            status=WorkoutSession.Status.IN_PROGRESS
        ).first()
        if not active_session:
            return Response(None, status=status.HTTP_200_OK)
        return Response(self.get_serializer(active_session).data)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def start(self, request):
        program_day_id = request.data.get('program_day_id')
        if not program_day_id:
            raise ValidationError({'program_day_id': 'This field is required.'})

        day = get_object_or_404(
            ProgramDay.objects.select_related('program').prefetch_related(
                'exercises__exercise__primary_muscle'
            ),
            pk=program_day_id,
            program__user=request.user,
        )
        if day.is_rest_day:
            raise ValidationError({'program_day_id': 'A rest day cannot be started.'})
        if not day.exercises.exists():
            raise ValidationError({'program_day_id': 'Add at least one exercise before starting.'})

        active_session = WorkoutSession.objects.select_for_update().filter(
            user=request.user,
            status=WorkoutSession.Status.IN_PROGRESS,
        ).first()
        if active_session:
            if active_session.program_day_id == day.id:
                active_session = session_queryset(request.user).get(pk=active_session.pk)
                return Response(self.get_serializer(active_session).data)
            raise ValidationError(
                {'detail': 'Finish or cancel your active workout before starting another.'}
            )

        workout = WorkoutSession.objects.create(
            user=request.user,
            program=day.program,
            program_day=day,
            program_name=day.program.name,
            name=day.name,
        )

        for planned_exercise in day.exercises.select_related(
            'exercise__primary_muscle'
        ).order_by('order'):
            workout_exercise = WorkoutExercise.objects.create(
                workout_session=workout,
                exercise=planned_exercise.exercise,
                exercise_name=planned_exercise.exercise.name,
                primary_muscle_name=planned_exercise.exercise.primary_muscle.name,
                order=planned_exercise.order,
                planned_weight=planned_exercise.target_weight,
                target_reps_min=planned_exercise.target_reps_min,
                target_reps_max=planned_exercise.target_reps_max,
                rest_seconds=planned_exercise.rest_seconds,
                notes=planned_exercise.notes,
            )
            WorkoutSet.objects.bulk_create([
                WorkoutSet(
                    workout_exercise=workout_exercise,
                    set_number=set_number,
                    weight=planned_exercise.target_weight,
                )
                for set_number in range(1, planned_exercise.target_sets + 1)
            ])

        workout = session_queryset(request.user).get(pk=workout.pk)
        return Response(
            self.get_serializer(workout).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def complete(self, request, pk=None):
        workout = WorkoutSession.objects.select_for_update().filter(
            pk=pk,
            user=request.user,
        ).first()
        if not workout:
            from rest_framework.exceptions import NotFound

            raise NotFound()
        if workout.status != WorkoutSession.Status.IN_PROGRESS:
            raise ValidationError({'detail': 'Only an active workout can be completed.'})

        completed_at = timezone.now()
        workout.status = WorkoutSession.Status.COMPLETED
        workout.completed_at = completed_at
        workout.duration_seconds = max(
            0,
            int((completed_at - workout.started_at).total_seconds()),
        )
        workout.notes = request.data.get('notes', workout.notes)
        workout.save(
            update_fields=[
                'status',
                'completed_at',
                'duration_seconds',
                'notes',
                'updated_at',
            ]
        )

        from tracking.serializers import PersonalRecordSerializer
        from tracking.services import award_workout_xp, detect_personal_records

        personal_records = detect_personal_records(workout)
        xp_transactions = award_workout_xp(workout, personal_records)
        workout = session_queryset(request.user).get(pk=workout.pk)
        response_data = self.get_serializer(workout).data
        response_data['completion_summary'] = {
            'new_personal_records': PersonalRecordSerializer(
                personal_records,
                many=True,
            ).data,
            'xp_awarded': sum(item.amount for item in xp_transactions),
        }
        return Response(response_data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        workout = self.get_object()
        if workout.status != WorkoutSession.Status.IN_PROGRESS:
            raise ValidationError({'detail': 'Only an active workout can be cancelled.'})

        ended_at = timezone.now()
        workout.status = WorkoutSession.Status.CANCELLED
        workout.completed_at = ended_at
        workout.duration_seconds = max(
            0,
            int((ended_at - workout.started_at).total_seconds()),
        )
        workout.save(
            update_fields=['status', 'completed_at', 'duration_seconds', 'updated_at']
        )
        workout = session_queryset(request.user).get(pk=workout.pk)
        return Response(self.get_serializer(workout).data)

    @action(detail=True, methods=['patch'], url_path='notes')
    def update_notes(self, request, pk=None):
        workout = self.get_object()
        if workout.status != WorkoutSession.Status.IN_PROGRESS:
            raise ValidationError({'detail': 'Only an active workout can be edited.'})
        notes = request.data.get('notes', '')
        if not isinstance(notes, str):
            raise ValidationError({'notes': 'Notes must be text.'})
        workout.notes = notes
        workout.save(update_fields=['notes', 'updated_at'])
        workout = session_queryset(request.user).get(pk=workout.pk)
        return Response(self.get_serializer(workout).data)


class WorkoutSetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkoutSetSerializer

    def get_queryset(self):
        return WorkoutSet.objects.filter(
            workout_exercise__workout_session__user=self.request.user
        ).select_related('workout_exercise__workout_session')

    def perform_destroy(self, instance):
        if instance.workout_exercise.workout_session.status != WorkoutSession.Status.IN_PROGRESS:
            raise ValidationError('Sets can only be removed while the workout is in progress.')
        if not instance.is_extra:
            raise ValidationError('Planned sets cannot be removed from an active workout.')
        if instance.is_completed:
            raise ValidationError('Uncomplete this extra set before removing it.')
        instance.delete()


class WorkoutSetCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkoutSetSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        workout_exercise = get_object_or_404(
            WorkoutExercise.objects.select_related('workout_session'),
            pk=self.kwargs['exercise_id'],
            workout_session__user=request.user,
        )
        if workout_exercise.workout_session.status != WorkoutSession.Status.IN_PROGRESS:
            raise ValidationError('Sets can only be added while the workout is in progress.')

        last_number = workout_exercise.sets.aggregate(
            maximum=Max('set_number')
        )['maximum'] or 0
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workout_set = serializer.save(
            workout_exercise=workout_exercise,
            set_number=last_number + 1,
            is_extra=True,
        )
        return Response(
            self.get_serializer(workout_set).data,
            status=status.HTTP_201_CREATED,
        )
