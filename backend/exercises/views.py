from django.db.models import Q
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import Equipment, Exercise, MuscleGroup
from .serializers import EquipmentSerializer, ExerciseSerializer, MuscleGroupSerializer


class MuscleGroupViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = MuscleGroup.objects.all()
    serializer_class = MuscleGroupSerializer


class EquipmentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer


class ExerciseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExerciseSerializer

    def get_queryset(self):
        queryset = Exercise.objects.filter(
            Q(is_custom=False) | Q(created_by=self.request.user)
        ).select_related('primary_muscle', 'equipment').prefetch_related(
            'secondary_muscles'
        )

        search = self.request.query_params.get('search', '').strip()
        primary_muscle = self.request.query_params.get('primary_muscle', '').strip()
        equipment = self.request.query_params.get('equipment', '').strip()
        custom = self.request.query_params.get('custom', '').strip().lower()

        if search:
            queryset = queryset.filter(name__icontains=search)
        if primary_muscle:
            queryset = queryset.filter(
                Q(primary_muscle_id=primary_muscle)
                if primary_muscle.isdigit()
                else Q(primary_muscle__slug=primary_muscle)
            )
        if equipment:
            queryset = queryset.filter(
                Q(equipment_id=equipment)
                if equipment.isdigit()
                else Q(equipment__slug=equipment)
            )
        if custom == 'true':
            queryset = queryset.filter(is_custom=True, created_by=self.request.user)
        elif custom == 'false':
            queryset = queryset.filter(is_custom=False)

        return queryset.order_by('name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_custom=True)

    def perform_update(self, serializer):
        if not serializer.instance.is_custom or serializer.instance.created_by != self.request.user:
            raise PermissionDenied('Only your own custom exercises can be edited.')
        serializer.save(created_by=self.request.user, is_custom=True)

    def perform_destroy(self, instance):
        if not instance.is_custom or instance.created_by != self.request.user:
            raise PermissionDenied('Only your own custom exercises can be deleted.')
        try:
            instance.delete()
        except ProtectedError as error:
            raise ValidationError(
                'Remove this exercise from your workout programs before deleting it.'
            ) from error
