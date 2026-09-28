from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils.text import slugify


def unique_slug(model, value, instance_id=None):
    base_slug = slugify(value) or 'item'
    slug = base_slug
    counter = 2

    queryset = model.objects.all()
    if instance_id:
        queryset = queryset.exclude(pk=instance_id)

    while queryset.filter(slug=slug).exists():
        slug = f'{base_slug}-{counter}'
        counter += 1

    return slug


class MuscleGroup(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(MuscleGroup, self.name, self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Equipment(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Equipment, self.name, self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Exercise(models.Model):
    name = models.CharField(max_length=140)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    primary_muscle = models.ForeignKey(
        MuscleGroup,
        on_delete=models.PROTECT,
        related_name='primary_exercises',
    )
    secondary_muscles = models.ManyToManyField(
        MuscleGroup,
        blank=True,
        related_name='secondary_exercises',
    )
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.PROTECT,
        related_name='exercises',
    )
    instructions = models.TextField(blank=True)
    is_custom = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='custom_exercises',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(is_custom=False, created_by__isnull=True)
                    | Q(is_custom=True, created_by__isnull=False)
                ),
                name='exercise_custom_owner_consistency',
            ),
            models.UniqueConstraint(
                fields=['name'],
                condition=Q(is_custom=False),
                name='unique_system_exercise_name',
            ),
            models.UniqueConstraint(
                fields=['created_by', 'name'],
                condition=Q(is_custom=True),
                name='unique_custom_exercise_name_per_user',
            ),
        ]

    def clean(self):
        if self.is_custom and not self.created_by_id:
            raise ValidationError({'created_by': 'Custom exercises require an owner.'})
        if not self.is_custom and self.created_by_id:
            raise ValidationError({'created_by': 'System exercises cannot have an owner.'})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Exercise, self.name, self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
