from django.db import IntegrityError, transaction
from django.db.models import Count, F, OuterRef, Prefetch, Q, Subquery
from django.utils import timezone

from buildings.models import Unit
from common.constants import MessagingMessages
from users.models import User, UserRole

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


def get_valid_recipients(user):
    """Return active Residents and Managers, excluding the request user and Service Staff.

    Args:
        user: The authenticated user making the request.

    Returns:
        QuerySet of User objects that are valid recipients for direct messages.
    """
    return User.objects.filter(
        is_active=True,
        role__in={UserRole.RESIDENT, UserRole.MANAGER, UserRole.ADMIN},
    ).exclude(id=user.id)


def serialize_recipient(user_obj):
    """Serialize a user object for the recipients list.

    Args:
        user_obj: A User instance.

    Returns:
        Dictionary with id, full_name, and role.
    """
    return {
        "id": user_obj.id,
        "full_name": user_obj.full_name,
        "role": user_obj.role,
    }


def validate_direct_message_target(user_id, request_user):
    """Validate that the target user_id is a valid recipient for direct messaging.

    Args:
        user_id: The ID of the user to send a direct message to.
        request_user: The authenticated user making the request.

    Returns:
        The target User object if valid.

    Raises:
        MessagingError: If validation fails.
    """
    if str(user_id) == str(request_user.id):
        raise MessagingError("شما نمی‌توانید به خودتان پیام مستقیم ارسال کنید.")

    try:
        target_user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise MessagingError("کاربر مورد نظر یافت نشد.")

    if not target_user.is_active:
        raise MessagingError("شما نمی‌توانید به کاربر غیرفعال پیام ارسال کنید.")

    if target_user.role == UserRole.SERVICE_STAFF:
        raise MessagingError("شما نمی‌توانید به کارکنان خدمات پیام ارسال کنید.")

    return target_user


def get_or_create_direct_conversation(user_a, user_b, subject):
    """Find an existing direct conversation between user_a and user_b, or create one.

    Args:
        user_a: First participant (the request user).
        user_b: Second participant.
        subject: Subject line for the conversation.

    Returns:
        Tuple of (Conversation, created: bool).
    """
    # Look for existing direct conversation between these two users
    # We need to find a conversation where both users are participants
    existing = (
        Conversation.objects.filter(
            kind=ConversationKind.DIRECT,
            resident=None,  # Direct conversations have no resident
        )
        .prefetch_related("participants")
        .filter(
            participants__user=user_a,
        )
        .filter(
            participants__user=user_b,
        )
        .distinct()
        .first()
    )

    if existing is not None:
        # Ensure both participants are attached
        _ensure_direct_participant(existing, user_a)
        _ensure_direct_participant(existing, user_b)
        return existing, False

    try:
        with transaction.atomic():
            conversation = Conversation.objects.create(
                kind=ConversationKind.DIRECT,
                subject=subject,
                created_by=user_a,
                resident=None,  # Direct conversations don't belong to a resident
                last_message_at=timezone.now(),
            )
            ConversationParticipant.objects.create(
                conversation=conversation,
                user=user_a,
                is_management_resident=False,
            )
            ConversationParticipant.objects.create(
                conversation=conversation,
                user=user_b,
                is_management_resident=False,
            )
            return conversation, True
    except IntegrityError:
        # Race condition - another thread created it
        existing = (
            Conversation.objects.filter(
                kind=ConversationKind.DIRECT,
            )
            .prefetch_related("participants")
            .filter(participants__user=user_a)
            .filter(participants__user=user_b)
            .distinct()
            .first()
        )
        if existing:
            _ensure_direct_participant(existing, user_a)
            _ensure_direct_participant(existing, user_b)
            return existing, False
        raise


def _ensure_direct_participant(conversation, user):
    """Ensure a user is a participant in a direct conversation."""
    ConversationParticipant.objects.get_or_create(
        conversation=conversation,
        user=user,
        defaults={"is_management_resident": False},
    )


@transaction.atomic
def send_direct_message(*, sender, recipient_id, subject, body):
    """Send a direct message from sender to recipient.

    Creates or reuses a direct conversation and adds the message.

    Args:
        sender: The user sending the message.
        recipient_id: The ID of the recipient user.
        subject: Subject line for the conversation.
        body: Message body.

    Returns:
        Tuple of (Conversation, Message).
    """
    recipient = validate_direct_message_target(recipient_id, sender)

    conversation, _created = get_or_create_direct_conversation(
        user_a=sender,
        user_b=recipient,
        subject=subject,
    )

    message = post_message(conversation, sender, body)

    return conversation, message
