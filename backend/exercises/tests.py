from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Equipment, Exercise, MuscleGroup


User = get_user_model()


class ExerciseApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('owner', password='StrongPassword123')
        self.other_user = User.objects.create_user('other', password='StrongPassword123')
        self.muscle = MuscleGroup.objects.create(name='Chest')
        self.equipment = Equipment.objects.create(name='Barbell')
        self.system_exercise = Exercise.objects.create(
            name='Barbell Bench Press',
            primary_muscle=self.muscle,
            equipment=self.equipment,
        )
        self.other_custom_exercise = Exercise.objects.create(
            name='Other User Press',
            primary_muscle=self.muscle,
            equipment=self.equipment,
            is_custom=True,
            created_by=self.other_user,
        )
        self.client.force_authenticate(self.user)

    def test_authenticated_user_can_list_system_exercises(self):
        response = self.client.get(reverse('exercise-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, 'Barbell Bench Press')
        self.assertNotContains(response, 'Other User Press')

    def test_user_can_create_custom_exercise(self):
        response = self.client.post(
            reverse('exercise-list'),
            {
                'name': 'Paused Bench Press',
                'primary_muscle_id': self.muscle.id,
                'secondary_muscle_ids': [],
                'equipment_id': self.equipment.id,
                'instructions': 'Pause briefly on the chest.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        exercise = Exercise.objects.get(name='Paused Bench Press')
        self.assertTrue(exercise.is_custom)
        self.assertEqual(exercise.created_by, self.user)

    def test_user_cannot_edit_another_users_custom_exercise(self):
        response = self.client.patch(
            reverse('exercise-detail', args=[self.other_custom_exercise.id]),
            {'name': 'Changed'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_edit_own_custom_exercise(self):
        exercise = Exercise.objects.create(
            name='Owner Press',
            primary_muscle=self.muscle,
            equipment=self.equipment,
            is_custom=True,
            created_by=self.user,
        )

        response = self.client.patch(
            reverse('exercise-detail', args=[exercise.id]),
            {'name': 'Owner Tempo Press'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        exercise.refresh_from_db()
        self.assertEqual(exercise.name, 'Owner Tempo Press')

    def test_user_cannot_delete_system_exercise(self):
        response = self.client.delete(
            reverse('exercise-detail', args=[self.system_exercise.id])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Exercise.objects.filter(pk=self.system_exercise.id).exists())
