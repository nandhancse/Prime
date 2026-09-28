from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ProgramDay, ProgramExercise, WorkoutProgram
from .serializers import (
    ProgramDaySerializer,
    ProgramExerciseSerializer,
    WorkoutProgramSerializer,
)


class WorkoutProgramViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkoutProgramSerializer

    def get_queryset(self):
        return WorkoutProgram.objects.filter(user=self.request.user).prefetch_related(
            'days__exercises__exercise__primary_muscle',
            'days__exercises__exercise__equipment',
            'days__exercises__exercise__secondary_muscles',
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        program = self.get_object()
        program.activate()
        return Response(self.get_serializer(program).data)


class ProgramDayListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProgramDaySerializer

    def get_program(self):
        return get_object_or_404(
            WorkoutProgram,
            pk=self.kwargs['program_id'],
            user=self.request.user,
        )

    def get_queryset(self):
        return ProgramDay.objects.filter(program=self.get_program()).prefetch_related(
            'exercises__exercise__primary_muscle',
            'exercises__exercise__equipment',
            'exercises__exercise__secondary_muscles',
        )

    def perform_create(self, serializer):
        serializer.save(program=self.get_program())


class ProgramDayDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProgramDaySerializer

    def get_queryset(self):
        return ProgramDay.objects.filter(
            program__user=self.request.user
        ).prefetch_related(
            'exercises__exercise__primary_muscle',
            'exercises__exercise__equipment',
            'exercises__exercise__secondary_muscles',
        )


class ProgramExerciseCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProgramExerciseSerializer

    def perform_create(self, serializer):
        day = get_object_or_404(
            ProgramDay,
            pk=self.kwargs['day_id'],
            program__user=self.request.user,
        )
        if day.is_rest_day:
            raise ValidationError({'program_day': 'Rest days cannot contain exercises.'})
        serializer.save(program_day=day)


class ProgramExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProgramExerciseSerializer

    def get_queryset(self):
        return ProgramExercise.objects.filter(
            program_day__program__user=self.request.user
        ).select_related('exercise__primary_muscle', 'exercise__equipment').prefetch_related(
            'exercise__secondary_muscles'
        )
