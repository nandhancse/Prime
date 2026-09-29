from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from .google_auth import GoogleTokenError
from .models import SocialAccount, UserProfile


User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.refresh_url = reverse('token-refresh')
        self.profile_url = reverse('profile')
        self.password = 'StrongPassword123'
        self.registration_data = {
            'username': 'auth_test_user',
            'password': self.password,
            'confirm_password': self.password,
        }

    def register(self, **overrides):
        payload = {**self.registration_data, **overrides}
        return self.client.post(self.register_url, payload, format='json')

    def create_user(self):
        return User.objects.create_user(
            username=self.registration_data['username'],
            password=self.password,
        )

    def login(self, password=None):
        return self.client.post(
            self.login_url,
            {
                'username': self.registration_data['username'],
                'password': password or self.password,
            },
            format='json',
        )

    def test_successful_registration(self):
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Account created successfully')
        self.assertEqual(response.data['user']['username'], 'auth_test_user')
        self.assertEqual(response.data['user']['email'], '')
        self.assertNotIn('password', response.data)
        self.assertNotIn('password', response.data['user'])
        self.assertNotIn('confirm_password', response.data['user'])
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        profile = UserProfile.objects.get(user__username='auth_test_user')
        self.assertFalse(profile.onboarding_completed)

    def test_duplicate_username_is_rejected_case_insensitively(self):
        self.create_user()

        response = self.register(
            username='AUTH_TEST_USER',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['username'][0],
            'A user with this username already exists.',
        )

    def test_password_mismatch_is_rejected(self):
        response = self.register(confirm_password='DifferentPassword123')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['confirm_password'][0], 'Passwords do not match.')

    def test_short_password_is_rejected(self):
        response = self.register(password='short', confirm_password='short')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_missing_required_fields_are_rejected(self):
        response = self.client.post(self.register_url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            set(response.data),
            {'username', 'password', 'confirm_password'},
        )

    def test_password_is_hashed(self):
        response = self.register()
        user = User.objects.get(username=self.registration_data['username'])

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(user.password, self.password)
        self.assertTrue(user.check_password(self.password))

    def test_successful_login_after_registration(self):
        self.register()

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'auth_test_user')
        self.assertNotIn('password', response.data)
        self.assertNotIn('password', response.data['user'])

    def test_invalid_login_is_rejected(self):
        self.create_user()

        response = self.login(password='IncorrectPassword123')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], 'Invalid username or password.')

    def test_authenticated_profile_access(self):
        user = self.create_user()
        login_response = self.login()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], user.id)
        self.assertEqual(response.data['username'], 'auth_test_user')
        self.assertEqual(response.data['email'], '')
        self.assertEqual(response.data['preferred_weight_unit'], 'kg')

    def test_profile_is_created_and_can_be_updated(self):
        user = self.create_user()
        self.client.force_authenticate(user)

        response = self.client.patch(
            self.profile_url,
            {
                'display_name': 'Test Athlete',
                'height_cm': '178.50',
                'current_weight_kg': '82.25',
                'training_experience': 'intermediate',
                'primary_fitness_goal': 'strength',
                'weekly_workout_target': 4,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.display_name, 'Test Athlete')
        self.assertEqual(profile.weekly_workout_target, 4)

    def test_onboarding_profile_can_be_completed(self):
        user = self.create_user()
        self.client.force_authenticate(user)

        response = self.client.patch(
            self.profile_url,
            {
                'display_name': 'Test Athlete',
                'height_cm': '178.5',
                'current_weight_kg': '82.2',
                'training_experience': 'intermediate',
                'primary_fitness_goal': 'strength',
                'weekly_workout_target': 4,
                'current_training_split': 'upper_lower',
                'onboarding_completed': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['onboarding_completed'])
        self.assertEqual(response.data['current_training_split'], 'upper_lower')

    def test_custom_split_requires_a_name(self):
        user = self.create_user()
        self.client.force_authenticate(user)

        response = self.client.patch(
            self.profile_url,
            {
                'current_training_split': 'custom',
                'custom_training_split': '',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('custom_training_split', response.data)

    def test_profile_rejects_unreasonable_numeric_values(self):
        user = self.create_user()
        self.client.force_authenticate(user)

        response = self.client.patch(
            self.profile_url,
            {'height_cm': '500', 'current_weight_kg': '-2', 'weekly_workout_target': 0},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {'height_cm', 'current_weight_kg', 'weekly_workout_target'})

    def test_unauthenticated_profile_is_rejected(self):
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_returns_a_new_access_token(self):
        self.create_user()
        login_response = self.login()

        response = self.client.post(
            self.refresh_url,
            {'refresh': login_response.data['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class CorsConfigurationTests(TestCase):
    def test_local_vite_origins_receive_cors_headers(self):
        client = Client()
        request_headers = {
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD': 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS': 'content-type',
            'HTTP_HOST': '127.0.0.1',
        }

        for origin in (
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
        ):
            with self.subTest(origin=origin):
                response = client.options(
                    reverse('register'),
                    HTTP_ORIGIN=origin,
                    **request_headers,
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.headers['Access-Control-Allow-Origin'], origin)


@override_settings(GOOGLE_CLIENT_IDS=('web-client-id', 'android-client-id'))
class GoogleAuthenticationTests(APITestCase):
    def setUp(self):
        self.url = reverse('google-login')
        self.claims = {
            'sub': 'google-user-123',
            'email': 'nandhan@example.com',
            'email_verified': True,
            'name': 'Nandhan PK',
            'picture': 'https://example.com/avatar.png',
            'iss': 'https://accounts.google.com',
        }

    def test_missing_credential_is_rejected(self):
        response = self.client.post(self.url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('credential', response.data)

    @patch('accounts.serializers.verify_google_identity_token')
    def test_invalid_token_is_rejected(self, verify):
        verify.side_effect = GoogleTokenError('Invalid Google credential.')

        response = self.client.post(self.url, {'credential': 'invalid'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('accounts.google_auth.id_token.verify_oauth2_token', side_effect=ValueError)
    def test_wrong_audience_is_rejected(self, _verify):
        response = self.client.post(self.url, {'credential': 'wrong-audience'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('accounts.google_auth.id_token.verify_oauth2_token', side_effect=ValueError)
    def test_malformed_token_is_rejected(self, _verify):
        response = self.client.post(self.url, {'credential': 'not-a-jwt'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('accounts.serializers.verify_google_identity_token')
    def test_first_google_login_creates_user_and_social_account(self, verify):
        verify.return_value = self.claims

        response = self.client.post(self.url, {'credential': 'valid'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = User.objects.get(email='nandhan@example.com')
        self.assertFalse(user.has_usable_password())
        social = SocialAccount.objects.get(user=user)
        self.assertEqual(social.provider_user_id, 'google-user-123')
        self.assertEqual(user.fitness_profile.display_name, 'Nandhan PK')

    @patch('accounts.serializers.verify_google_identity_token')
    def test_repeated_google_login_returns_same_user(self, verify):
        verify.return_value = self.claims

        first = self.client.post(self.url, {'credential': 'valid'}, format='json')
        second = self.client.post(self.url, {'credential': 'valid'}, format='json')

        self.assertEqual(first.data['user']['id'], second.data['user']['id'])
        self.assertEqual(User.objects.filter(email='nandhan@example.com').count(), 1)

    @patch('accounts.serializers.verify_google_identity_token')
    def test_duplicate_google_identity_is_not_created(self, verify):
        verify.return_value = self.claims

        self.client.post(self.url, {'credential': 'valid'}, format='json')
        self.client.post(self.url, {'credential': 'valid'}, format='json')

        self.assertEqual(SocialAccount.objects.count(), 1)

    @patch('accounts.serializers.verify_google_identity_token')
    def test_google_login_returns_prime_jwt(self, verify):
        verify.return_value = self.claims

        response = self.client.post(self.url, {'credential': 'valid'}, format='json')

        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    @patch('accounts.serializers.verify_google_identity_token')
    def test_verified_email_links_existing_prime_user(self, verify):
        existing = User.objects.create_user(
            username='existing',
            email='nandhan@example.com',
            password='StrongPassword123',
        )
        verify.return_value = self.claims

        response = self.client.post(self.url, {'credential': 'valid'}, format='json')

        self.assertEqual(response.data['user']['id'], existing.id)
        self.assertEqual(User.objects.count(), 1)
