from django.contrib import admin

from .models import WorkoutExercise, WorkoutSession, WorkoutSet


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'status', 'started_at', 'duration_seconds']
    list_filter = ['status', 'started_at']
    search_fields = ['name', 'program_name', 'user__username']
    ordering = ['-started_at']


@admin.register(WorkoutExercise)
class WorkoutExerciseAdmin(admin.ModelAdmin):
    list_display = ['exercise_name', 'workout_session', 'order', 'primary_muscle_name']
    search_fields = ['exercise_name', 'workout_session__name', 'workout_session__user__username']
    ordering = ['workout_session', 'order']


@admin.register(WorkoutSet)
class WorkoutSetAdmin(admin.ModelAdmin):
    list_display = ['workout_exercise', 'set_number', 'weight', 'reps', 'is_completed']
    list_filter = ['is_completed', 'completed_at']
    search_fields = ['workout_exercise__exercise_name', 'workout_exercise__workout_session__user__username']
    ordering = ['workout_exercise', 'set_number']
