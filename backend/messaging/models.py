from django.conf import settings
from django.db import models
from django.utils import timezone


class ConversationKind(models.TextChoices):
    MANAGEMENT = "management", "Management"
    DIRECT = "direct", "Direct"


class Conversation(models.Model):
    """A message thread.

    ``kind=management`` is the single shared desk between one resident and
    every manager/admin. The resident is stored both as ``resident`` (so the
    uniqueness constraint can be enforced) and as a ``ConversationParticipant``.
    """

    kind = models.CharField(max_length=20, choices=ConversationKind.choices)
    subject = models.CharField(max_length=255)
    is_broadcast = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_conversations",
    )
    # The resident this management desk belongs to. Always set for
    # kind=management; always null for kind=direct.
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="management_conversations",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-last_message_at", "-id"]
        verbose_name = "گفتگو"
        verbose_name_plural = "گفتگوها"
        constraints = [
            models.UniqueConstraint(
                fields=["resident"],
                condition=models.Q(kind=ConversationKind.MANAGEMENT)
                & models.Q(resident__isnull=False),
                name="messaging_unique_management_conversation_per_resident",
            ),
            models.CheckConstraint(
                condition=(
                    (
                        models.Q(kind=ConversationKind.MANAGEMENT)
                        & models.Q(resident__isnull=False)
                    )
                    | (
                        models.Q(kind=ConversationKind.DIRECT)
                        & models.Q(resident__isnull=True)
                    )
                ),
                name="messaging_conversation_resident_matches_kind",
            ),
        ]

    def __str__(self):
        return f"{self.get_kind_display()}: {self.subject}"


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_participations",
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    # True only on the resident seat of a management conversation. Combined
    # with the unique constraint below this is a second layer (on top of
    # Conversation.resident) that one resident cannot sit on two desks.
    is_management_resident = models.BooleanField(default=False)

    class Meta:
        verbose_name = "شرکت‌کننده گفتگو"
        verbose_name_plural = "شرکت‌کنندگان گفتگو"
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"],
                name="messaging_unique_conversation_participant",
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_management_resident=True),
                name="messaging_unique_management_resident_participant",
            ),
        ]

    def __str__(self):
        return f"{self.user} in conversation {self.conversation_id}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_messages",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = "پیام"
        verbose_name_plural = "پیام‌ها"

    def __str__(self):
        return f"Message {self.pk} in conversation {self.conversation_id}"
