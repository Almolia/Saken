from django.contrib.auth.base_user import BaseUserManager

from common.constants import ManagerMessages


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError(ManagerMessages.PHONE_REQUIRED)
        extra_fields.setdefault("username", phone)
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError(ManagerMessages.SUPERUSER_STAFF_REQUIRED)
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(ManagerMessages.SUPERUSER_SUPERUSER_REQUIRED)

        return self._create_user(phone, password, **extra_fields)
