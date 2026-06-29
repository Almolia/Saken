from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class UserRole(models.TextChoices):
    RESIDENT = 'resident', 'Resident'
    MANAGER = 'manager', 'Manager'
    ADMIN = 'admin', 'Admin'


class User(AbstractUser):
    email = None
    first_name = None
    last_name = None
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=11, unique=True)
    national_id = models.CharField(max_length=10, unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.RESIDENT)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['full_name', 'national_id']

    objects = UserManager()

    def __str__(self):
        return self.full_name
