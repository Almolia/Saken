from django.db import migrations, models


def fill_default_usernames(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for user in User.objects.all():
        if not user.username:
            user.username = user.phone
            user.save(update_fields=['username'])


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_alter_user_managers'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='username',
            field=models.CharField(blank=True, max_length=150, null=True, unique=True),
        ),
        migrations.RunPython(fill_default_usernames, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='user',
            name='is_disabled',
        ),
    ]
