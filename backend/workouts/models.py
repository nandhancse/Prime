from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from exercises.models import Exercise
from programs.models import ProgramDay, WorkoutProgram


class WorkoutSession(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'In progress'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workout_sessions',
    )
    program = models.ForeignKey(
        WorkoutProgram,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='workout_sessions',
    )
    program_day = models.ForeignKey(
        ProgramDay,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='workout_sessions',
    )
    name = models.CharField(max_length=120)
    program_name = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
    )
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-started_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status='in_progress'),
                name='one_active_workout_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.name}'


class WorkoutExercise(models.Model):
    workout_session = models.ForeignKey(
        WorkoutSession,
        on_delete=models.CASCADE,
        related_name='exercises',
    )
    exercise = models.ForeignKey(
        Exercise,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='workout_uses',
    )
    exercise_name = models.CharField(max_length=140)
    primary_muscle_name = models.CharField(max_length=80, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    planned_weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    target_reps_min = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    target_reps_max = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    rest_seconds = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['workout_session', 'order'],
                name='unique_workout_exercise_order',
            ),
        ]

    def __str__(self):
        return f'{self.workout_session.name} - {self.exercise_name}'


class WorkoutSet(models.Model):
    workout_exercise = models.ForeignKey(
        WorkoutExercise,
        on_delete=models.CASCADE,
        related_name='sets',
    )
    set_number = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
    )
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    reps = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    is_extra = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['set_number']
        constraints = [
            models.UniqueConstraint(
                fields=['workout_exercise', 'set_number'],
                name='unique_set_number_per_workout_exercise',
            ),
        ]

    def save(self, *args, **kwargs):
        if self.is_completed and not self.completed_at:
            self.completed_at = timezone.now()
        elif not self.is_completed:
            self.completed_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.workout_exercise.exercise_name} - Set {self.set_number}'
