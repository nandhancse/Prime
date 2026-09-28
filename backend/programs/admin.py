from django.contrib import admin

from .models import ProgramDay, ProgramExercise, WorkoutProgram


@admin.register(WorkoutProgram)
class WorkoutProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_active', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'user__username']
    ordering = ['-is_active', '-updated_at']


@admin.register(ProgramDay)
class ProgramDayAdmin(admin.ModelAdmin):
    list_display = ['name', 'program', 'day_of_week', 'order', 'is_rest_day']
    list_filter = ['day_of_week', 'is_rest_day']
    search_fields = ['name', 'program__name', 'program__user__username']
    ordering = ['program', 'order']


@admin.register(ProgramExercise)
class ProgramExerciseAdmin(admin.ModelAdmin):
    list_display = ['exercise', 'program_day', 'order', 'target_sets', 'target_reps_min', 'target_reps_max']
    list_filter = ['exercise__primary_muscle', 'exercise__equipment']
    search_fields = ['exercise__name', 'program_day__name', 'program_day__program__name']
    ordering = ['program_day', 'order']
