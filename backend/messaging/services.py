from django.db import IntegrityError, transaction
from django.db.models import Count, F, OuterRef, Prefetch, Q, Subquery
from django.utils import timezone

from buildings.models import Unit
from common.constants import MessagingMessages
from users.models import UserRole

from .models import Conversation, ConversationKind, ConversationParticipant, Message

PREVIEW_LIMIT = 140


class MessagingError(Exception):
    """User-facing messaging failure with an HTTP status."""

    def __init__(self, detail, status_code=400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def preview_text(text, limit=PREVIEW_LIMIT):
    cleaned = " ".join((text or "").split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def _unit_number_for(user):
    unit = user.units.order_by("floor", "unit_number").first() if user is not None else None
    return unit.unit_number if unit else None


def resolve_broadcast_residents(unit_ids):
    """Return unique unit owners targeted by a broadcast.

    An empty ``unit_ids`` list means every unit that currently has an owner.
    Unknown ids are rejected; units without an owner are skipped.
    """
    if unit_ids is None:
        unit_ids = []

    owned_units = Unit.objects.filter(owner__isnull=False).select_related("owner")
    if unit_ids:
        existing_ids = set(Unit.objects.filter(pk__in=unit_ids).values_list("pk", flat=True))
        missing = set(unit_ids) - existing_ids
        if missing:
            raise MessagingError(MessagingMessages.INVALID_UNITS)
        owned_units = owned_units.filter(pk__in=unit_ids)

    residents = []
    seen = set()
    for unit in owned_units.order_by("floor", "unit_number", "id"):
        if unit.owner_id in seen:
            continue
        seen.add(unit.owner_id)
        residents.append(unit.owner)

    if not residents:
        raise MessagingError(MessagingMessages.NO_RECIPIENTS)
    return residents


def get_or_create_management_conversation(resident, created_by, subject):
    """Return the resident's single management desk, creating it if needed."""
    existing = (
        Conversation.objects.filter(
            kind=ConversationKind.MANAGEMENT,
            resident=resident,
        )
        .first()
    )
    if existing is not None:
        _ensure_resident_participant(existing, resident)
        return existing, False

    try:
        with transaction.atomic():
            conversation = Conversation.objects.create(
                kind=ConversationKind.MANAGEMENT,
                subject=subject,
                created_by=created_by,
                resident=resident,
                last_message_at=timezone.now(),
            )
            ConversationParticipant.objects.create(
                conversation=conversation,
                user=resident,
                is_management_resident=True,
            )
            return conversation, True
    except IntegrityError:
        conversation = Conversation.objects.get(
            kind=ConversationKind.MANAGEMENT,
            resident=resident,
        )
        _ensure_resident_participant(conversation, resident)
        return conversation, False


def _ensure_resident_participant(conversation, resident):
    ConversationParticipant.objects.get_or_create(
        conversation=conversation,
        user=resident,
        defaults={"is_management_resident": True},
    )


def ensure_manager_participant(conversation, manager):
    """Lazily attach the current manager so unread can be tracked per person."""
    participant, _created = ConversationParticipant.objects.get_or_create(
        conversation=conversation,
        user=manager,
        defaults={"is_management_resident": False},
    )
    return participant


def post_message(conversation, sender, body, *, is_broadcast=False):
    now = timezone.now()
    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        body=body,
    )
    update_fields = ["last_message_at"]
    conversation.last_message_at = now
    if is_broadcast and not conversation.is_broadcast:
        conversation.is_broadcast = True
        update_fields.append("is_broadcast")
    elif is_broadcast:
        conversation.is_broadcast = True
        if "is_broadcast" not in update_fields:
            update_fields.append("is_broadcast")
    conversation.save(update_fields=update_fields)

    if sender.role in {UserRole.MANAGER, UserRole.ADMIN}:
        participant = ensure_manager_participant(conversation, sender)
    else:
        participant, _ = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=sender,
            defaults={
                "is_management_resident": conversation.kind == ConversationKind.MANAGEMENT
                and conversation.resident_id == sender.id
            },
        )
    participant.last_read_at = now
    participant.save(update_fields=["last_read_at"])
    return message


@transaction.atomic
def broadcast_message(*, manager, subject, body, unit_ids):
    residents = resolve_broadcast_residents(unit_ids)
    conversations = []
    for resident in residents:
        conversation, _created = get_or_create_management_conversation(
            resident=resident,
            created_by=manager,
            subject=subject,
        )
        post_message(conversation, manager, body, is_broadcast=True)
        conversations.append(conversation)
    return conversations


@transaction.atomic
def send_resident_to_management(*, resident, subject, body):
    conversation, _created = get_or_create_management_conversation(
        resident=resident,
        created_by=resident,
        subject=subject,
    )
    message = post_message(conversation, resident, body)
    return conversation, message


@transaction.atomic
def reply_to_conversation(*, conversation, sender, body):
    return post_message(conversation, sender, body)


def mark_conversation_read(*, conversation, user):
    now = timezone.now()
    if user.role in {UserRole.MANAGER, UserRole.ADMIN}:
        participant = ensure_manager_participant(conversation, user)
    else:
        participant, _ = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=user,
            defaults={
                "is_management_resident": conversation.kind == ConversationKind.MANAGEMENT
                and conversation.resident_id == user.id
            },
        )
    participant.last_read_at = now
    participant.save(update_fields=["last_read_at"])
    return participant


def unread_count_for(conversation, user):
    messages = conversation.messages.exclude(sender=user)
    participant = ConversationParticipant.objects.filter(
        conversation=conversation,
        user=user,
    ).first()
    if participant and participant.last_read_at is not None:
        messages = messages.filter(created_at__gt=participant.last_read_at)
    return messages.count()


def annotate_inbox(queryset, user):
    last_read = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("pk"),
        user=user,
    ).values("last_read_at")[:1]
    last_message = Message.objects.filter(conversation_id=OuterRef("pk")).order_by(
        "-created_at",
        "-id",
    )
    return queryset.annotate(
        viewer_last_read_at=Subquery(last_read),
        last_message_body=Subquery(last_message.values("body")[:1]),
    ).annotate(
        unread_count=Count(
            "messages",
            filter=~Q(messages__sender=user)
            & (
                Q(viewer_last_read_at__isnull=True)
                | Q(messages__created_at__gt=F("viewer_last_read_at"))
            ),
        ),
    )


def management_inbox_queryset(user):
    return (
        annotate_inbox(
            Conversation.objects.filter(kind=ConversationKind.MANAGEMENT).select_related(
                "resident"
            ),
            user,
        )
        .prefetch_related(
            Prefetch(
                "resident__units",
                queryset=Unit.objects.order_by("floor", "unit_number"),
            )
        )
        .order_by("-last_message_at", "-id")
    )


def resident_inbox_queryset(user):
    # Filter direct threads through a subquery so a JOIN on participants
    # cannot multiply message rows and inflate unread_count.
    return annotate_inbox(
        Conversation.objects.filter(
            Q(kind=ConversationKind.MANAGEMENT, resident=user)
            | Q(
                kind=ConversationKind.DIRECT,
                pk__in=ConversationParticipant.objects.filter(user=user).values(
                    "conversation_id"
                ),
            )
        ),
        user,
    ).order_by("-last_message_at", "-id")


def manager_can_access(user, conversation):
    if conversation.kind == ConversationKind.MANAGEMENT:
        return user.role in {UserRole.MANAGER, UserRole.ADMIN}
    return ConversationParticipant.objects.filter(
        conversation=conversation,
        user=user,
    ).exists()


def resident_can_access(user, conversation):
    if conversation.kind == ConversationKind.MANAGEMENT:
        return conversation.resident_id == user.id
    return ConversationParticipant.objects.filter(
        conversation=conversation,
        user=user,
    ).exists()


def conversation_messages(conversation):
    return conversation.messages.select_related("sender").order_by("created_at", "id")


def counterpart_label(*, conversation, viewer):
    if conversation.kind == ConversationKind.MANAGEMENT:
        if viewer.role == UserRole.RESIDENT:
            return "مدیریت ساختمان"
        resident = conversation.resident
        return resident.full_name if resident else "ساکن"
    other = (
        conversation.participants.exclude(user=viewer)
        .select_related("user")
        .first()
    )
    if other:
        return other.user.full_name
    return "گفتگو"


def serialize_resident_summary(resident):
    if resident is None:
        return None
    return {
        "id": resident.id,
        "full_name": resident.full_name,
        "unit_number": _unit_number_for(resident),
    }
