from django.db.models import Q
from rest_framework import serializers

from .models import Equipment, Exercise, MuscleGroup


class MuscleGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = MuscleGroup
        fields = ['id', 'name', 'slug']


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ['id', 'name', 'slug']


class ExerciseSerializer(serializers.ModelSerializer):
    primary_muscle = MuscleGroupSerializer(read_only=True)
    primary_muscle_id = serializers.PrimaryKeyRelatedField(
        queryset=MuscleGroup.objects.all(),
        source='primary_muscle',
        write_only=True,
    )
    secondary_muscles = MuscleGroupSerializer(many=True, read_only=True)
    secondary_muscle_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=MuscleGroup.objects.all(),
        source='secondary_muscles',
        required=False,
        write_only=True,
    )
    equipment = EquipmentSerializer(read_only=True)
    equipment_id = serializers.PrimaryKeyRelatedField(
        queryset=Equipment.objects.all(),
        source='equipment',
        write_only=True,
    )

    class Meta:
        model = Exercise
        fields = [
            'id',
            'name',
            'slug',
            'primary_muscle',
            'primary_muscle_id',
            'secondary_muscles',
            'secondary_muscle_ids',
            'equipment',
            'equipment_id',
            'instructions',
            'is_custom',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['slug', 'is_custom', 'created_at', 'updated_at']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Exercise name is required.')

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            duplicate = Exercise.objects.filter(
                created_by=request.user,
                is_custom=True,
                name__iexact=name,
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError(
                    'You already have a custom exercise with this name.'
                )

        return name

    def validate(self, attrs):
        primary = attrs.get('primary_muscle')
        secondary = attrs.get('secondary_muscles', [])
        if primary and primary in secondary:
            attrs['secondary_muscles'] = [item for item in secondary if item != primary]
        return attrs
