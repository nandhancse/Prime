from decimal import Decimal

from rest_framework import serializers

from .models import WorkoutExercise, WorkoutSession, WorkoutSet


class WorkoutSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = [
            'id',
            'set_number',
            'weight',
            'reps',
            'is_completed',
            'is_extra',
            'completed_at',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'set_number',
            'is_extra',
            'completed_at',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        if self.instance and (
            self.instance.workout_exercise.workout_session.status
            != WorkoutSession.Status.IN_PROGRESS
        ):
            raise serializers.ValidationError(
                'Sets can only be edited while the workout is in progress.'
            )
        return attrs


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True, read_only=True)
    completed_sets = serializers.SerializerMethodField()
    previous_performance = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutExercise
        fields = [
            'id',
            'exercise',
            'exercise_name',
            'primary_muscle_name',
            'order',
            'planned_weight',
            'target_reps_min',
            'target_reps_max',
            'rest_seconds',
            'notes',
            'completed_sets',
            'previous_performance',
            'sets',
        ]

    def get_completed_sets(self, obj):
        return sum(1 for workout_set in obj.sets.all() if workout_set.is_completed)

    def get_previous_performance(self, obj):
        return self.context.get('previous_performance', {}).get(obj.exercise_id, [])


class WorkoutSessionSerializer(serializers.ModelSerializer):
    exercises = serializers.SerializerMethodField()
    exercise_count = serializers.SerializerMethodField()
    completed_sets_count = serializers.SerializerMethodField()
    total_volume = serializers.SerializerMethodField()
    personal_record_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = [
            'id',
            'program',
            'program_day',
            'program_name',
            'name',
            'status',
            'started_at',
            'completed_at',
            'duration_seconds',
            'notes',
            'exercise_count',
            'completed_sets_count',
            'total_volume',
            'personal_record_count',
            'exercises',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_exercise_count(self, obj):
        return len(obj.exercises.all())

    def get_exercises(self, obj):
        exercises = list(obj.exercises.all())
        previous_performance = {}
        request = self.context.get('request')
        if request and obj.status == WorkoutSession.Status.IN_PROGRESS:
            from tracking.services import get_previous_performance

            previous_performance = get_previous_performance(
                request.user,
                [item.exercise_id for item in exercises if item.exercise_id],
                exclude_session_id=obj.id,
            )
        return WorkoutExerciseSerializer(
            exercises,
            many=True,
            context={**self.context, 'previous_performance': previous_performance},
        ).data

    def get_completed_sets_count(self, obj):
        return sum(
            1
            for exercise in obj.exercises.all()
            for workout_set in exercise.sets.all()
            if workout_set.is_completed
        )

    def get_total_volume(self, obj):
        total = sum(
            (
                workout_set.weight * workout_set.reps
                for exercise in obj.exercises.all()
                for workout_set in exercise.sets.all()
                if workout_set.is_completed
            ),
            Decimal('0'),
        )
        return float(total)

    def get_personal_record_count(self, obj):
        prefetched = getattr(obj, '_prefetched_objects_cache', {})
        if 'personal_records' in prefetched:
            return len(obj.personal_records.all())
        return obj.personal_records.count()
