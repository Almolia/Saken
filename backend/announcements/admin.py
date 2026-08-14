from django.contrib import admin
from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["title", "content", "author__full_name"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]