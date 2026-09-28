from django.db import transaction
from rest_framework import serializers

from exercises.models import Exercise
from exercises.serializers import ExerciseSerializer
from .models import ProgramDay, ProgramExercise, WorkoutProgram


class ProgramExerciseSerializer(serializers.ModelSerializer):
    exercise = ExerciseSerializer(read_only=True)
    exercise_id = serializers.PrimaryKeyRelatedField(
        queryset=Exercise.objects.all(),
        source='exercise',
        write_only=True,
    )

    class Meta:
        model = ProgramExercise
        fields = [
            'id',
            'exercise',
            'exercise_id',
            'order',
            'target_sets',
            'target_reps_min',
            'target_reps_max',
            'target_weight',
            'rest_seconds',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_exercise(self, exercise):
        request = self.context.get('request')
        if exercise.is_custom and (
            not request or exercise.created_by_id != request.user.id
        ):
            raise serializers.ValidationError('This exercise is not available to you.')
        return exercise

    def validate(self, attrs):
        minimum = attrs.get(
            'target_reps_min',
            getattr(self.instance, 'target_reps_min', None),
        )
        maximum = attrs.get(
            'target_reps_max',
            getattr(self.instance, 'target_reps_max', None),
        )
        if minimum is not None and maximum is not None and maximum < minimum:
            raise serializers.ValidationError(
                {'target_reps_max': 'Maximum reps must be greater than or equal to minimum reps.'}
            )
        return attrs


class ProgramDaySerializer(serializers.ModelSerializer):
    exercises = ProgramExerciseSerializer(many=True, required=False)
    day_of_week_display = serializers.CharField(
        source='get_day_of_week_display',
        read_only=True,
    )

    class Meta:
        model = ProgramDay
        fields = [
            'id',
            'name',
            'day_of_week',
            'day_of_week_display',
            'order',
            'is_rest_day',
            'exercises',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Workout day name is required.')
        return name

    def validate(self, attrs):
        is_rest_day = attrs.get(
            'is_rest_day',
            getattr(self.instance, 'is_rest_day', False),
        )
        exercises = attrs.get('exercises')
        if is_rest_day and exercises:
            raise serializers.ValidationError(
                {'exercises': 'Rest days cannot contain exercises.'}
            )
        return attrs

    def create(self, validated_data):
        exercise_data = validated_data.pop('exercises', [])
        day = ProgramDay.objects.create(**validated_data)
        self._replace_exercises(day, exercise_data)
        return day

    def update(self, instance, validated_data):
        exercise_data = validated_data.pop('exercises', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if exercise_data is not None:
            self._replace_exercises(instance, exercise_data)
        return instance

    @staticmethod
    def _replace_exercises(day, exercise_data):
        day.exercises.all().delete()
        for index, item in enumerate(exercise_data):
            item.setdefault('order', index)
            ProgramExercise.objects.create(program_day=day, **item)


class WorkoutProgramSerializer(serializers.ModelSerializer):
    days = ProgramDaySerializer(many=True, required=False)
    day_count = serializers.IntegerField(source='days.count', read_only=True)

    class Meta:
        model = WorkoutProgram
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'day_count',
            'days',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Program name is required.')

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            duplicate = WorkoutProgram.objects.filter(
                user=request.user,
                name__iexact=name,
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError(
                    'You already have a workout program with this name.'
                )
        return name

    def validate_days(self, days):
        orders = [day.get('order', index) for index, day in enumerate(days)]
        if len(orders) != len(set(orders)):
            raise serializers.ValidationError('Workout day order values must be unique.')
        return days

    @transaction.atomic
    def create(self, validated_data):
        days_data = validated_data.pop('days', [])
        program = WorkoutProgram.objects.create(**validated_data)
        self._replace_days(program, days_data)
        return program

    @transaction.atomic
    def update(self, instance, validated_data):
        days_data = validated_data.pop('days', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if days_data is not None:
            instance.days.all().delete()
            self._replace_days(instance, days_data)
        return instance

    def _replace_days(self, program, days_data):
        day_serializer = ProgramDaySerializer(context=self.context)
        for index, day_data in enumerate(days_data):
            day_data.setdefault('order', index)
            day_serializer.create({'program': program, **day_data})
