from django.db import migrations, models


def mark_existing_profiles_complete(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    UserProfile.objects.update(onboarding_completed=True)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0002_socialaccount'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='current_training_split',
            field=models.CharField(
                choices=[
                    ('none', 'No current split'),
                    ('push_pull_legs', 'Push / Pull / Legs'),
                    ('upper_lower', 'Upper / Lower'),
                    ('full_body', 'Full Body'),
                    ('bro_split', 'Body-part split'),
                    ('custom', 'Custom'),
                ],
                default='none',
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='custom_training_split',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='onboarding_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_profiles_complete, migrations.RunPython.noop),
    ]
}
