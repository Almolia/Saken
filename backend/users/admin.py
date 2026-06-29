from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ('id',)
    list_display = ('id', 'full_name', 'username', 'phone', 'national_id', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    search_fields = ('full_name', 'username', 'phone', 'national_id')
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('اطلاعات کاربر', {'fields': ('full_name', 'username', 'national_id', 'role')}),
        ('دسترسی‌ها', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('تاریخ‌ها', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('phone', 'username', 'full_name', 'national_id', 'role', 'password1', 'password2', 'is_staff', 'is_superuser'),
            },
        ),
    )
    filter_horizontal = ('groups', 'user_permissions')
