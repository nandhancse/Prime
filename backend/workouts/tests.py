from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from exercises.models import Equipment, Exercise, MuscleGroup
from programs.models import ProgramDay, ProgramExercise, WorkoutProgram
from .models import WorkoutExercise, WorkoutSession, WorkoutSet


User = get_user_model()


class WorkoutApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('athlete', password='StrongPassword123')
        self.other_user = User.objects.create_user('other-athlete', password='StrongPassword123')
        muscle = MuscleGroup.objects.create(name='Quadriceps')
        equipment = Equipment.objects.create(name='Barbell')
        self.exercise = Exercise.objects.create(
            name='Barbell Back Squat',
            primary_muscle=muscle,
            equipment=equipment,
        )
        self.program = WorkoutProgram.objects.create(user=self.user, name='Strength')
        self.day = ProgramDay.objects.create(
            program=self.program,
            name='Leg Day',
            order=0,
        )
        ProgramExercise.objects.create(
            program_day=self.day,
            exercise=self.exercise,
            target_sets=3,
            target_reps_min=5,
            target_reps_max=8,
            target_weight='60.00',
        )
        self.other_program = WorkoutProgram.objects.create(
            user=self.other_user,
            name='Other Program',
        )
        self.other_day = ProgramDay.objects.create(
            program=self.other_program,
            name='Private Day',
            order=0,
        )
        ProgramExercise.objects.create(
            program_day=self.other_day,
            exercise=self.exercise,
            target_sets=1,
        )
        self.client.force_authenticate(self.user)

    def start_workout(self):
        return self.client.post(
            reverse('workout-start'),
            {'program_day_id': self.day.id},
            format='json',
        )

    def test_user_can_start_own_day_and_planned_sets_are_created(self):
        response = self.start_workout()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Leg Day')
        self.assertEqual(len(response.data['exercises']), 1)
        self.assertEqual(len(response.data['exercises'][0]['sets']), 3)

    def test_user_cannot_start_another_users_day(self):
        response = self.client.post(
            reverse('workout-start'),
            {'program_day_id': self.other_day.id},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_update_own_set_but_not_another_users_set(self):
        response = self.start_workout()
        own_set_id = response.data['exercises'][0]['sets'][0]['id']

        update_response = self.client.patch(
            reverse('workout-set-detail', args=[own_set_id]),
            {'weight': '70.00', 'reps': 6, 'is_completed': True},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertTrue(update_response.data['is_completed'])

        self.client.force_authenticate(self.other_user)
        forbidden_response = self.client.patch(
            reverse('workout-set-detail', args=[own_set_id]),
            {'reps': 10},
            format='json',
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_completing_workout_stores_duration_history_and_completed_volume(self):
        start_response = self.start_workout()
        workout_id = start_response.data['id']
        first_set = start_response.data['exercises'][0]['sets'][0]
        second_set = start_response.data['exercises'][0]['sets'][1]

        self.client.patch(
            reverse('workout-set-detail', args=[first_set['id']]),
            {'weight': '60.00', 'reps': 8, 'is_completed': True},
            format='json',
        )
        self.client.patch(
            reverse('workout-set-detail', args=[second_set['id']]),
            {'weight': '100.00', 'reps': 10, 'is_completed': False},
            format='json',
        )

        complete_response = self.client.post(
            reverse('workout-complete', args=[workout_id]),
            {},
            format='json',
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_response.data['status'], 'completed')
        self.assertIsNotNone(complete_response.data['completed_at'])
        self.assertGreaterEqual(complete_response.data['duration_seconds'], 0)
        self.assertEqual(complete_response.data['total_volume'], 480.0)

        history_response = self.client.get(reverse('workout-list'))
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data), 1)
        self.assertEqual(history_response.data[0]['id'], workout_id)
        self.assertEqual(
            WorkoutSession.objects.get(pk=workout_id).status,
            WorkoutSession.Status.COMPLETED,
        )

    def test_completion_rejects_repeat_and_cancelled_workout_is_excluded_from_history(self):
        completed_start = self.start_workout()
        completed_id = completed_start.data['id']
        first_complete = self.client.post(reverse('workout-complete', args=[completed_id]))
        repeated_complete = self.client.post(reverse('workout-complete', args=[completed_id]))

        cancelled_start = self.start_workout()
        cancelled_id = cancelled_start.data['id']
        cancel_response = self.client.post(reverse('workout-cancel', args=[cancelled_id]))
        history = self.client.get(reverse('workout-list'))

        self.assertEqual(first_complete.status_code, status.HTTP_200_OK)
        self.assertEqual(repeated_complete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in history.data], [completed_id])

    def test_only_incomplete_extra_sets_can_be_deleted(self):
        response = self.start_workout()
        exercise = response.data['exercises'][0]
        planned_set = exercise['sets'][0]

        planned_delete = self.client.delete(
            reverse('workout-set-detail', args=[planned_set['id']])
        )
        extra_response = self.client.post(
            reverse('workout-set-create', args=[exercise['id']]),
            {'weight': '60.00', 'reps': 0},
            format='json',
        )
        extra_delete = self.client.delete(
            reverse('workout-set-detail', args=[extra_response.data['id']])
        )

        self.assertEqual(planned_delete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(extra_response.data['is_extra'])
        self.assertEqual(extra_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_history_and_details_are_private(self):
        response = self.start_workout()
        workout_id = response.data['id']
        self.client.post(reverse('workout-complete', args=[workout_id]))

        self.client.force_authenticate(self.other_user)
        history = self.client.get(reverse('workout-list'))
        detail = self.client.get(reverse('workout-detail', args=[workout_id]))

        self.assertEqual(history.status_code, status.HTTP_200_OK)
        self.assertEqual(history.data, [])
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_active_workout_includes_previous_session_performance(self):
        previous = WorkoutSession.objects.create(
            user=self.user,
            name='Previous Leg Day',
            status=WorkoutSession.Status.COMPLETED,
            completed_at=timezone.now(),
        )
        previous_exercise = WorkoutExercise.objects.create(
            workout_session=previous,
            exercise=self.exercise,
            exercise_name=self.exercise.name,
            primary_muscle_name='Quadriceps',
        )
        WorkoutSet.objects.create(
            workout_exercise=previous_exercise,
            set_number=1,
            weight='72.50',
            reps=7,
            is_completed=True,
        )

        response = self.start_workout()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data['exercises'][0]['previous_performance'],
            [{'weight': 72.5, 'reps': 7}],
        )

    def test_complete_workout_management_flow_persists_through_api(self):
        custom_response = self.client.post(
            reverse('exercise-list'),
            {
                'name': 'Tempo Squat',
                'primary_muscle_id': self.exercise.primary_muscle_id,
                'secondary_muscle_ids': [],
                'equipment_id': self.exercise.equipment_id,
                'instructions': 'Use a controlled three-second lowering phase.',
            },
            format='json',
        )
        self.assertEqual(custom_response.status_code, status.HTTP_201_CREATED)

        program_response = self.client.post(
            reverse('program-list'),
            {
                'name': 'End-to-End Program',
                'description': 'Created through the complete API flow test.',
                'days': [
                    {
                        'name': 'Strength A',
                        'day_of_week': 'monday',
                        'order': 0,
                        'is_rest_day': False,
                        'exercises': [
                            {
                                'exercise_id': self.exercise.id,
                                'order': 0,
                                'target_sets': 2,
                                'target_reps_min': 5,
                                'target_reps_max': 8,
                                'target_weight': '50.00',
                                'rest_seconds': 90,
                            }
                        ],
                    },
                    {
                        'name': 'Strength B',
                        'day_of_week': 'thursday',
                        'order': 1,
                        'is_rest_day': False,
                        'exercises': [
                            {
                                'exercise_id': custom_response.data['id'],
                                'order': 0,
                                'target_sets': 2,
                                'target_reps_min': 6,
                                'target_reps_max': 10,
                                'target_weight': '40.00',
                                'rest_seconds': 75,
                            }
                        ],
                    },
                ],
            },
            format='json',
        )
        self.assertEqual(program_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(program_response.data['days']), 2)

        program_id = program_response.data['id']
        activate_response = self.client.post(
            reverse('program-activate', args=[program_id])
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.assertTrue(activate_response.data['is_active'])

        start_response = self.client.post(
            reverse('workout-start'),
            {'program_day_id': program_response.data['days'][0]['id']},
            format='json',
        )
        self.assertEqual(start_response.status_code, status.HTTP_201_CREATED)
        workout_id = start_response.data['id']
        workout_exercise = start_response.data['exercises'][0]
        first_set = workout_exercise['sets'][0]

        completed_set_response = self.client.patch(
            reverse('workout-set-detail', args=[first_set['id']]),
            {'weight': '55.00', 'reps': 6, 'is_completed': True},
            format='json',
        )
        self.assertEqual(completed_set_response.status_code, status.HTTP_200_OK)

        extra_set_response = self.client.post(
            reverse('workout-set-create', args=[workout_exercise['id']]),
            {'weight': '50.00', 'reps': 5, 'is_completed': True},
            format='json',
        )
        self.assertEqual(extra_set_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(extra_set_response.data['set_number'], 3)

        complete_response = self.client.post(
            reverse('workout-complete', args=[workout_id]),
            {},
            format='json',
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_response.data['total_volume'], 580.0)

        history_response = self.client.get(reverse('workout-list'))
        self.assertTrue(any(item['id'] == workout_id for item in history_response.data))

        detail_response = self.client.get(reverse('workout-detail', args=[workout_id]))
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['exercises'][0]['sets'][-1]['set_number'], 3)
