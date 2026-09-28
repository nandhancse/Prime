from django.contrib import admin

from .models import BodyMeasurement, PersonalRecord, XPTransaction


@admin.register(PersonalRecord)
class PersonalRecordAdmin(admin.ModelAdmin):
    list_display = [
        'exercise_name',
        'user',
        'record_type',
        'record_value',
        'weight',
        'repetitions',
        'achieved_at',
    ]
    list_filter = ['record_type', 'achieved_at']
    search_fields = ['exercise_name', 'user__username', 'workout_session__name']
    ordering = ['-achieved_at']


@admin.register(BodyMeasurement)
class BodyMeasurementAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'body_weight_kg', 'body_fat_percentage', 'updated_at']
    list_filter = ['date']
    search_fields = ['user__username', 'user__email']
    ordering = ['-date']


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'reason', 'workout_session', 'created_at']
    list_filter = ['reason', 'created_at']
    search_fields = ['user__username', 'reference', 'workout_session__name']
    ordering = ['-created_at']
