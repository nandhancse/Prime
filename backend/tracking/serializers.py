from django.utils import timezone
from rest_framework import serializers

from .models import BodyMeasurement, PersonalRecord, XPTransaction


class PersonalRecordSerializer(serializers.ModelSerializer):
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)
    workout_name = serializers.CharField(source='workout_session.name', read_only=True)
    workout_session_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = PersonalRecord
        fields = [
            'id',
            'exercise',
            'exercise_name',
            'record_type',
            'record_type_display',
            'record_value',
            'weight',
            'repetitions',
            'workout_session_id',
            'workout_name',
            'achieved_at',
        ]
        read_only_fields = fields


class BodyMeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyMeasurement
        fields = [
            'id',
            'date',
            'body_weight_kg',
            'body_fat_percentage',
            'chest_cm',
            'waist_cm',
            'hips_cm',
            'left_arm_cm',
            'right_arm_cm',
            'left_thigh_cm',
            'right_thigh_cm',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError('Measurement date cannot be in the future.')
        return value


class XPTransactionSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    workout_name = serializers.CharField(source='workout_session.name', read_only=True)

    class Meta:
        model = XPTransaction
        fields = [
            'id',
            'amount',
            'reason',
            'reason_display',
            'workout_session',
            'workout_name',
            'created_at',
        ]
        read_only_fields = fields
