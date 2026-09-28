from django.contrib import admin

from .models import Equipment, Exercise, MuscleGroup


@admin.register(MuscleGroup)
class MuscleGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ['name', 'primary_muscle', 'equipment', 'is_custom', 'created_by']
    list_filter = ['is_custom', 'primary_muscle', 'equipment']
    search_fields = ['name', 'created_by__username']
    filter_horizontal = ['secondary_muscles']
    ordering = ['name']
