from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from .google_auth import GoogleTokenError, verify_google_identity_token
from .models import SocialAccount, UserProfile


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class UserProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    training_experience_display = serializers.CharField(
        source='get_training_experience_display',
        read_only=True,
    )
    primary_fitness_goal_display = serializers.CharField(
        source='get_primary_fitness_goal_display',
        read_only=True,
    )
    preferred_weight_unit_display = serializers.CharField(
        source='get_preferred_weight_unit_display',
        read_only=True,
    )

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'display_name',
            'date_of_birth',
            'gender',
            'gender_display',
            'height_cm',
            'current_weight_kg',
            'training_experience',
            'training_experience_display',
            'primary_fitness_goal',
            'primary_fitness_goal_display',
            'weekly_workout_target',
            'preferred_weight_unit',
            'preferred_weight_unit_display',
            'default_rest_seconds',
            'compact_workout_layout',
            'confirm_before_incomplete_workout',
            'confirm_before_cancel_workout',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        min_length=8,
        required=True,
        trim_whitespace=False,
        write_only=True,
    )
    confirm_password = serializers.CharField(
        min_length=8,
        required=True,
        trim_whitespace=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = ['username', 'password', 'confirm_password']

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError('Username is required.')
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return username

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match.'}
            )

        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        trim_whitespace=False,
        write_only=True,
    )

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['username'],
            password=attrs['password'],
        )

        if user is None:
            raise AuthenticationFailed('Invalid username or password.')

        if not user.is_active:
            raise AuthenticationFailed('This account is inactive.')

        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }


def available_username(name, email):
    base = slugify(name or email.split('@', 1)[0]).replace('-', '_')[:140] or 'prime_user'
    candidate = base
    suffix = 2
    while User.objects.filter(username__iexact=candidate).exists():
        ending = str(suffix)
        candidate = f'{base[:150 - len(ending)]}{ending}'
        suffix += 1
    return candidate


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(required=True, trim_whitespace=True)

    def validate(self, attrs):
        try:
            claims = verify_google_identity_token(attrs['credential'])
        except GoogleTokenError as error:
            raise AuthenticationFailed(str(error)) from error

        subject = claims.get('sub')
        email = User.objects.normalize_email(claims.get('email', '')).strip()
        email_verified = claims.get('email_verified') is True
        if not subject or not email or not email_verified:
            raise AuthenticationFailed('Google account email could not be verified.')

        name = (claims.get('name') or '').strip()
        avatar_url = (claims.get('picture') or '').strip()

        with transaction.atomic():
            social = SocialAccount.objects.select_related('user').filter(
                provider=SocialAccount.Provider.GOOGLE,
                provider_user_id=subject,
            ).first()

            if social:
                user = social.user
                changed = []
                for field, value in (
                    ('email', email),
                    ('display_name', name),
                    ('avatar_url', avatar_url),
                ):
                    if getattr(social, field) != value:
                        setattr(social, field, value)
                        changed.append(field)
                if changed:
                    social.save(update_fields=[*changed, 'updated_at'])
            else:
                user = User.objects.filter(email__iexact=email).order_by('id').first()
                if user is None:
                    user = User.objects.create_user(
                        username=available_username(name, email),
                        email=email,
                    )
                social = SocialAccount.objects.create(
                    user=user,
                    provider=SocialAccount.Provider.GOOGLE,
                    provider_user_id=subject,
                    email=email,
                    display_name=name,
                    avatar_url=avatar_url,
                )

            profile, _ = UserProfile.objects.get_or_create(user=user)
            if name and not profile.display_name:
                profile.display_name = name
                profile.save(update_fields=['display_name', 'updated_at'])

        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }
