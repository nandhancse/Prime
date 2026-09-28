from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from exercises.models import Equipment, Exercise, MuscleGroup
from .models import WorkoutProgram


User = get_user_model()


class ProgramApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('program-owner', password='StrongPassword123')
        self.other_user = User.objects.create_user('other-owner', password='StrongPassword123')
        muscle = MuscleGroup.objects.create(name='Back')
        equipment = Equipment.objects.create(name='Cable')
        self.exercise = Exercise.objects.create(
            name='Lat Pulldown',
            primary_muscle=muscle,
            equipment=equipment,
        )
        self.client.force_authenticate(self.user)

    def program_payload(self, name='Push Pull'):
        return {
            'name': name,
            'description': 'A simple starter program.',
            'days': [
                {
                    'name': 'Pull',
                    'day_of_week': 'monday',
                    'order': 0,
                    'is_rest_day': False,
                    'exercises': [
                        {
                            'exercise_id': self.exercise.id,
                            'order': 0,
                            'target_sets': 3,
                            'target_reps_min': 8,
                            'target_reps_max': 12,
                            'target_weight': '40.00',
                            'rest_seconds': 90,
                        }
                    ],
                }
            ],
        }

    def test_user_can_create_program_with_nested_days(self):
        response = self.client.post(
            reverse('program-list'),
            self.program_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['days'][0]['exercises'][0]['target_sets'], 3)
        self.assertEqual(WorkoutProgram.objects.get().user, self.user)

    def test_user_cannot_access_another_users_program(self):
        program = WorkoutProgram.objects.create(user=self.other_user, name='Private')
        response = self.client.get(reverse('program-detail', args=[program.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_activating_program_deactivates_previous_program(self):
        first = WorkoutProgram.objects.create(user=self.user, name='First', is_active=True)
        second = WorkoutProgram.objects.create(user=self.user, name='Second')

        response = self.client.post(reverse('program-activate', args=[second.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_active)
        self.assertTrue(second.is_active)

    def test_rest_days_cannot_contain_exercises(self):
        payload = self.program_payload('Rest validation')
        payload['days'][0]['is_rest_day'] = True

        response = self.client.post(reverse('program-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('days', response.data)

    def test_invalid_rep_range_is_rejected(self):
        payload = self.program_payload('Invalid reps')
        payload['days'][0]['exercises'][0]['target_reps_min'] = 12
        payload['days'][0]['exercises'][0]['target_reps_max'] = 8

        response = self.client.post(reverse('program-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('days', response.data)
