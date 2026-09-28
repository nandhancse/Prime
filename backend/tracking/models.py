from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from exercises.models import Exercise


class PersonalRecord(models.Model):
    class RecordType(models.TextChoices):
        HEAVIEST_WEIGHT = 'heaviest_weight', 'Heaviest weight'
        WEIGHT_REPS = 'weight_reps', 'Most repetitions at weight'
        ESTIMATED_ONE_REP_MAX = 'estimated_1rm', 'Estimated one-rep max'
        SET_VOLUME = 'set_volume', 'Highest set volume'
        EXERCISE_VOLUME = 'exercise_volume', 'Highest workout exercise volume'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='personal_records',
    )
    exercise = models.ForeignKey(
        Exercise,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='personal_records',
    )
    exercise_name = models.CharField(max_length=140)
    record_type = models.CharField(max_length=32, choices=RecordType.choices)
    record_value = models.DecimalField(max_digits=12, decimal_places=2)
    weight = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    repetitions = models.PositiveSmallIntegerField(default=0)
    workout_set = models.ForeignKey(
        'workouts.WorkoutSet',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='personal_records',
    )
    workout_session = models.ForeignKey(
        'workouts.WorkoutSession',
        on_delete=models.CASCADE,
        related_name='personal_records',
    )
    reference = models.CharField(max_length=180)
    achieved_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-achieved_at', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'reference'],
                name='unique_personal_record_reference_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.exercise_name} - {self.get_record_type_display()}'


class BodyMeasurement(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='body_measurements',
    )
    date = models.DateField()
    body_weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(20), MaxValueValidator(500)],
    )
    body_fat_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(75)],
    )
    chest_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(300)],
    )
    waist_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(300)],
    )
    hips_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(300)],
    )
    left_arm_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(10), MaxValueValidator(100)],
    )
    right_arm_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(10), MaxValueValidator(100)],
    )
    left_thigh_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(15), MaxValueValidator(150)],
    )
    right_thigh_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(15), MaxValueValidator(150)],
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'],
                name='one_body_measurement_per_user_date',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.date}'


class XPTransaction(models.Model):
    class Reason(models.TextChoices):
        WORKOUT_COMPLETE = 'workout_complete', 'Workout completed'
        ALL_SETS_COMPLETE = 'all_sets_complete', 'All planned sets completed'
        PERSONAL_RECORD = 'personal_record', 'Personal record achieved'
        WEEKLY_TARGET = 'weekly_target', 'Weekly workout target completed'
        BODY_MEASUREMENT = 'body_measurement', 'Body measurement added'
        SEVEN_DAY_STREAK = 'seven_day_streak', 'Seven-day streak achieved'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='xp_transactions',
    )
    amount = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    reason = models.CharField(max_length=32, choices=Reason.choices)
    workout_session = models.ForeignKey(
        'workouts.WorkoutSession',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='xp_transactions',
    )
    body_measurement = models.ForeignKey(
        BodyMeasurement,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='xp_transactions',
    )
    reference = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'reference'],
                name='unique_xp_reference_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} +{self.amount} XP - {self.get_reason_display()}'
