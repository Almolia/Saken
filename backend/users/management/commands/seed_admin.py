import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from users.models import UserRole


REQUIRED_ENV_VARS = (
    'SAKEN_ADMIN_PHONE',
    'SAKEN_ADMIN_FULL_NAME',
    'SAKEN_ADMIN_NATIONAL_ID',
    'SAKEN_ADMIN_PASSWORD',
)


class Command(BaseCommand):
    help = 'Create the initial admin from explicit environment variables.'

    def handle(self, *args, **options):
        values = {name: os.getenv(name, '').strip() for name in REQUIRED_ENV_VARS}
        missing = [name for name, value in values.items() if not value]
        if missing:
            raise CommandError(
                'Refusing to seed an admin. Set these environment variables first: '
                + ', '.join(missing)
            )

        password = values['SAKEN_ADMIN_PASSWORD']
        if len(password) < 8:
            raise CommandError('SAKEN_ADMIN_PASSWORD must contain at least 8 characters.')

        phone = values['SAKEN_ADMIN_PHONE']
        User = get_user_model()

        with transaction.atomic():
            existing = User.objects.filter(phone=phone).first()
            if existing:
                if existing.role != UserRole.ADMIN or not existing.is_superuser:
                    raise CommandError(
                        f'A non-admin user already exists with phone {phone}; no account was changed.'
                    )
                self.stdout.write(self.style.WARNING(f'Admin {phone} already exists; nothing to do.'))
                return

            User.objects.create_superuser(
                phone=phone,
                username=os.getenv('SAKEN_ADMIN_USERNAME', '').strip() or phone,
                full_name=values['SAKEN_ADMIN_FULL_NAME'],
                national_id=values['SAKEN_ADMIN_NATIONAL_ID'],
                password=password,
            )

        self.stdout.write(self.style.SUCCESS(f'Admin {phone} created.'))
