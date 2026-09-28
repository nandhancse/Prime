from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import Q

from exercises.models import Exercise


class WorkoutProgram(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workout_programs',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_active', '-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name'],
                name='unique_program_name_per_user',
            ),
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(is_active=True),
                name='one_active_program_per_user',
            ),
        ]

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.is_active and self.user_id:
                WorkoutProgram.objects.filter(
                    user_id=self.user_id,
                    is_active=True,
                ).exclude(pk=self.pk).update(is_active=False)
            super().save(*args, **kwargs)

    def activate(self):
        self.is_active = True
        self.save(update_fields=['is_active', 'updated_at'])

    def __str__(self):
        return self.name


class ProgramDay(models.Model):
    class DayOfWeek(models.TextChoices):
        MONDAY = 'monday', 'Monday'
        TUESDAY = 'tuesday', 'Tuesday'
        WEDNESDAY = 'wednesday', 'Wednesday'
        THURSDAY = 'thursday', 'Thursday'
        FRIDAY = 'friday', 'Friday'
        SATURDAY = 'saturday', 'Saturday'
        SUNDAY = 'sunday', 'Sunday'
        FLEXIBLE = 'flexible', 'Flexible'

    program = models.ForeignKey(
        WorkoutProgram,
        on_delete=models.CASCADE,
        related_name='days',
    )
    name = models.CharField(max_length=120)
    day_of_week = models.CharField(
        max_length=12,
        choices=DayOfWeek.choices,
        default=DayOfWeek.FLEXIBLE,
    )
    order = models.PositiveSmallIntegerField(default=0)
    is_rest_day = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['program', 'order'],
                name='unique_day_order_per_program',
            ),
        ]

    def __str__(self):
        return f'{self.program.name} - {self.name}'


class ProgramExercise(models.Model):
    program_day = models.ForeignKey(
        ProgramDay,
        on_delete=models.CASCADE,
        related_name='exercises',
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.PROTECT,
        related_name='program_uses',
    )
    order = models.PositiveSmallIntegerField(default=0)
    target_sets = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1)],
    )
    target_reps_min = models.PositiveSmallIntegerField(
        default=8,
        validators=[MinValueValidator(1)],
    )
    target_reps_max = models.PositiveSmallIntegerField(
        default=12,
        validators=[MinValueValidator(1)],
    )
    target_weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    rest_seconds = models.PositiveIntegerField(default=90)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['program_day', 'order'],
                name='unique_exercise_order_per_day',
            ),
            models.UniqueConstraint(
                fields=['program_day', 'exercise'],
                name='unique_exercise_per_day',
            ),
        ]

    def __str__(self):
        return f'{self.program_day.name} - {self.exercise.name}'
