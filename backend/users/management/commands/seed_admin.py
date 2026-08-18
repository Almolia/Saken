import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction

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
        national_id = values['SAKEN_ADMIN_NATIONAL_ID']
        username = os.getenv('SAKEN_ADMIN_USERNAME', '').strip() or phone
        User = get_user_model()

        with transaction.atomic():
            # All three fields are unique. Treat a match on any of them as the
            # same seed account when it is already an admin; this keeps deploys
            # idempotent even if an environment value (for example the phone)
            # changed after the first seed.
            identity_matches = User.objects.filter(
                models.Q(phone=phone)
                | models.Q(national_id=national_id)
                | models.Q(username=username)
            )
            existing_admin = identity_matches.filter(
                role=UserRole.ADMIN,
                is_superuser=True,
            ).first()
            if existing_admin:
                self.stdout.write(
                    self.style.WARNING(
                        f'Admin {existing_admin.phone} already exists; nothing to do.'
                    )
                )
                return

            if identity_matches.exists():
                raise CommandError(
                    'A non-admin user already uses the configured phone, username, '
                    'or national ID; no account was changed.'
                )

            User.objects.create_superuser(
                phone=phone,
                username=username,
                full_name=values['SAKEN_ADMIN_FULL_NAME'],
                national_id=national_id,
                password=password,
            )

        self.stdout.write(self.style.SUCCESS(f'Admin {phone} created.'))
