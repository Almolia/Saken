from django.contrib import admin
from .models import Poll, PollOption, Vote


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2
    fields = ["text", "position"]
    ordering = ["position", "id"]


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "starts_at", "ends_at", "created_by", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["title", "description", "created_by__full_name"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [PollOptionInline]
    filter_horizontal = ["target_units"]


@admin.register(PollOption)
class PollOptionAdmin(admin.ModelAdmin):
    list_display = ["poll", "text", "position"]
    list_filter = ["poll__status"]
    search_fields = ["poll__title", "text"]


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ["poll", "option", "resident", "created_at"]
    list_filter = ["poll", "created_at"]
    search_fields = [
        "poll__title",
        "option__text",
        "resident__full_name",
    ]
    readonly_fields = ["created_at"]