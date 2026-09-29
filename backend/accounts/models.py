from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class UserProfile(models.Model):
    class Gender(models.TextChoices):
        NOT_SPECIFIED = '', 'Prefer not to say'
        FEMALE = 'female', 'Female'
        MALE = 'male', 'Male'
        NON_BINARY = 'non_binary', 'Non-binary'
        OTHER = 'other', 'Other'

    class TrainingExperience(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'

    class FitnessGoal(models.TextChoices):
        MUSCLE_GAIN = 'muscle_gain', 'Muscle gain'
        STRENGTH = 'strength', 'Strength'
        FAT_LOSS = 'fat_loss', 'Fat loss'
        GENERAL_FITNESS = 'general_fitness', 'General fitness'

    class WeightUnit(models.TextChoices):
        KILOGRAMS = 'kg', 'Kilograms'
        POUNDS = 'lb', 'Pounds'

    class TrainingSplit(models.TextChoices):
        NONE = 'none', 'No current split'
        PUSH_PULL_LEGS = 'push_pull_legs', 'Push / Pull / Legs'
        UPPER_LOWER = 'upper_lower', 'Upper / Lower'
        FULL_BODY = 'full_body', 'Full Body'
        BRO_SPLIT = 'bro_split', 'Body-part split'
        CUSTOM = 'custom', 'Custom'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fitness_profile',
    )
    display_name = models.CharField(max_length=120, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=Gender.choices, blank=True)
    height_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(80), MaxValueValidator(250)],
    )
    current_weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(500)],
    )
    training_experience = models.CharField(
        max_length=20,
        choices=TrainingExperience.choices,
        default=TrainingExperience.BEGINNER,
    )
    primary_fitness_goal = models.CharField(
        max_length=24,
        choices=FitnessGoal.choices,
        default=FitnessGoal.GENERAL_FITNESS,
    )
    weekly_workout_target = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(14)],
    )
    current_training_split = models.CharField(
        max_length=24,
        choices=TrainingSplit.choices,
        default=TrainingSplit.NONE,
    )
    custom_training_split = models.CharField(max_length=120, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    preferred_weight_unit = models.CharField(
        max_length=2,
        choices=WeightUnit.choices,
        default=WeightUnit.KILOGRAMS,
    )
    default_rest_seconds = models.PositiveIntegerField(
        default=90,
        validators=[MaxValueValidator(3600)],
    )
    compact_workout_layout = models.BooleanField(default=False)
    confirm_before_incomplete_workout = models.BooleanField(default=True)
    confirm_before_cancel_workout = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} profile'


class SocialAccount(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = 'google', 'Google'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_accounts',
    )
    provider = models.CharField(max_length=24, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=255)
    email = models.EmailField()
    display_name = models.CharField(max_length=255, blank=True)
    avatar_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_user_id'],
                name='unique_social_identity',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.get_provider_display()}'
