from django.core.management.base import BaseCommand

from exercises.models import Equipment, Exercise, MuscleGroup


MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps',
    'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms', 'Full Body',
]

EQUIPMENT = [
    'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine',
    'Kettlebell', 'Resistance Band', 'Other',
]

EXERCISES = [
    ('Barbell Bench Press', 'Chest', 'Barbell'),
    ('Dumbbell Bench Press', 'Chest', 'Dumbbell'),
    ('Incline Dumbbell Press', 'Chest', 'Dumbbell'),
    ('Chest Press Machine', 'Chest', 'Machine'),
    ('Cable Fly', 'Chest', 'Cable'),
    ('Push-Up', 'Chest', 'Bodyweight'),
    ('Lat Pulldown', 'Back', 'Cable'),
    ('Pull-Up', 'Back', 'Bodyweight'),
    ('Barbell Row', 'Back', 'Barbell'),
    ('Seated Cable Row', 'Back', 'Cable'),
    ('One-Arm Dumbbell Row', 'Back', 'Dumbbell'),
    ('T-Bar Row', 'Back', 'Machine'),
    ('Overhead Press', 'Shoulders', 'Barbell'),
    ('Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'),
    ('Lateral Raise', 'Shoulders', 'Dumbbell'),
    ('Rear Delt Fly', 'Shoulders', 'Dumbbell'),
    ('Face Pull', 'Shoulders', 'Cable'),
    ('Barbell Curl', 'Biceps', 'Barbell'),
    ('Dumbbell Curl', 'Biceps', 'Dumbbell'),
    ('Hammer Curl', 'Biceps', 'Dumbbell'),
    ('Preacher Curl', 'Biceps', 'Machine'),
    ('Cable Curl', 'Biceps', 'Cable'),
    ('Triceps Pushdown', 'Triceps', 'Cable'),
    ('Skull Crusher', 'Triceps', 'Barbell'),
    ('Overhead Triceps Extension', 'Triceps', 'Dumbbell'),
    ('Close-Grip Bench Press', 'Triceps', 'Barbell'),
    ('Bench Dip', 'Triceps', 'Bodyweight'),
    ('Barbell Back Squat', 'Quadriceps', 'Barbell'),
    ('Leg Press', 'Quadriceps', 'Machine'),
    ('Leg Extension', 'Quadriceps', 'Machine'),
    ('Romanian Deadlift', 'Hamstrings', 'Barbell'),
    ('Leg Curl', 'Hamstrings', 'Machine'),
    ('Walking Lunge', 'Quadriceps', 'Dumbbell'),
    ('Bulgarian Split Squat', 'Quadriceps', 'Dumbbell'),
    ('Hip Thrust', 'Glutes', 'Barbell'),
    ('Standing Calf Raise', 'Calves', 'Machine'),
    ('Plank', 'Core', 'Bodyweight'),
    ('Crunch', 'Core', 'Bodyweight'),
    ('Hanging Leg Raise', 'Core', 'Bodyweight'),
    ('Cable Crunch', 'Core', 'Cable'),
    ('Russian Twist', 'Core', 'Bodyweight'),
]


class Command(BaseCommand):
    help = 'Safely create the starter PRime muscle groups, equipment, and exercises.'

    def handle(self, *args, **options):
        muscles = {
            name: MuscleGroup.objects.get_or_create(name=name)[0]
            for name in MUSCLE_GROUPS
        }
        equipment = {
            name: Equipment.objects.get_or_create(name=name)[0]
            for name in EQUIPMENT
        }

        created_count = 0
        updated_count = 0
        for name, muscle_name, equipment_name in EXERCISES:
            exercise, created = Exercise.objects.update_or_create(
                name=name,
                is_custom=False,
                defaults={
                    'primary_muscle': muscles[muscle_name],
                    'equipment': equipment[equipment_name],
                    'created_by': None,
                    'instructions': f'Perform {name} with controlled form and a comfortable range of motion.',
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
            exercise.secondary_muscles.clear()

        self.stdout.write(
            self.style.SUCCESS(
                f'Seed complete: {created_count} exercises created, '
                f'{updated_count} exercises updated.'
            )
        )
