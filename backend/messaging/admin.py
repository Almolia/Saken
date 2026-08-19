from django.contrib import admin

from .models import Conversation, ConversationParticipant, Message


class ConversationParticipantInline(admin.TabularInline):
    model = ConversationParticipant
    extra = 0
    autocomplete_fields = ["user"]
    readonly_fields = ["last_read_at"]


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    autocomplete_fields = ["sender"]
    readonly_fields = ["created_at"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "subject",
        "kind",
        "is_broadcast",
        "resident",
        "created_by",
        "last_message_at",
    ]
    list_filter = ["kind", "is_broadcast", "created_at"]
    search_fields = ["subject", "resident__full_name", "created_by__full_name"]
    autocomplete_fields = ["created_by", "resident"]
    readonly_fields = ["created_at", "last_message_at"]
    ordering = ["-last_message_at"]
    inlines = [ConversationParticipantInline, MessageInline]


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "user", "is_management_resident", "last_read_at"]
    list_filter = ["is_management_resident"]
    search_fields = ["user__full_name", "conversation__subject"]
    autocomplete_fields = ["conversation", "user"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "sender", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["body", "sender__full_name", "conversation__subject"]
    autocomplete_fields = ["conversation", "sender"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]
