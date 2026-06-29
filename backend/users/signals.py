from django.apps import apps
from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .models import UserRole


@receiver(post_migrate)
def ensure_default_admin(sender, **kwargs):
    if sender.name != 'users':
        return

    User = apps.get_model('users', 'User')
    if User.objects.filter(role=UserRole.ADMIN).exists():
        return

    User.objects.create_user(
        phone='09130000000',
        full_name='admin',
        national_id='0000000000',
        password='admin123',
        role=UserRole.ADMIN,
        is_staff=True,
        is_superuser=True,
    )
