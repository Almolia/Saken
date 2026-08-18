from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from users.models import UserRole


ADMIN_ENV = {
    'SAKEN_ADMIN_PHONE': '09125550123',
    'SAKEN_ADMIN_USERNAME': 'initial-admin',
    'SAKEN_ADMIN_FULL_NAME': 'Initial Administrator',
    'SAKEN_ADMIN_NATIONAL_ID': '1234509876',
    'SAKEN_ADMIN_PASSWORD': 'StrongAdminPassword!42',
}


class SeedAdminCommandTests(TestCase):
    def test_command_is_idempotent_by_phone(self):
        with patch.dict('os.environ', ADMIN_ENV, clear=False):
            call_command('seed_admin', stdout=StringIO())
            call_command('seed_admin', stdout=StringIO())

        User = get_user_model()
        self.assertEqual(User.objects.filter(phone=ADMIN_ENV['SAKEN_ADMIN_PHONE']).count(), 1)
        admin = User.objects.get(phone=ADMIN_ENV['SAKEN_ADMIN_PHONE'])
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password(ADMIN_ENV['SAKEN_ADMIN_PASSWORD']))

    def test_existing_admin_with_same_national_id_is_not_duplicated(self):
        User = get_user_model()
        existing = User.objects.create_superuser(
            phone='09120000000',
            username='old-admin',
            full_name='Existing Admin',
            national_id=ADMIN_ENV['SAKEN_ADMIN_NATIONAL_ID'],
            password='ExistingPassword!42',
        )

        with patch.dict('os.environ', ADMIN_ENV, clear=False):
            call_command('seed_admin', stdout=StringIO())

        self.assertEqual(User.objects.filter(role=UserRole.ADMIN).count(), 1)
        self.assertTrue(User.objects.filter(pk=existing.pk).exists())
        self.assertFalse(User.objects.filter(phone=ADMIN_ENV['SAKEN_ADMIN_PHONE']).exists())

    def test_command_refuses_to_run_without_credentials(self):
        empty_env = {name: '' for name in ADMIN_ENV}
        with patch.dict('os.environ', empty_env, clear=False):
            with self.assertRaises(CommandError):
                call_command('seed_admin', stdout=StringIO())

        self.assertEqual(get_user_model().objects.count(), 0)

    def test_normal_database_setup_does_not_create_an_admin(self):
        self.assertFalse(get_user_model().objects.filter(role=UserRole.ADMIN).exists())
