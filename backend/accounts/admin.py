from django.contrib import admin

from .models import SocialAccount, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'display_name',
        'training_experience',
        'primary_fitness_goal',
        'weekly_workout_target',
        'preferred_weight_unit',
        'updated_at',
    ]
    list_filter = [
        'training_experience',
        'primary_fitness_goal',
        'preferred_weight_unit',
    ]
    search_fields = ['user__username', 'user__email', 'display_name']
    ordering = ['user__username']


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ['user', 'provider', 'email', 'display_name', 'created_at']
    list_filter = ['provider']
    search_fields = ['user__username', 'email', 'display_name']
    readonly_fields = ['provider_user_id', 'created_at', 'updated_at']
