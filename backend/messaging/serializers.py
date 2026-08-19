from rest_framework import serializers

from common.constants import MessagingMessages

from .models import Message
from .services import counterpart_label, preview_text, serialize_resident_summary


def _clean_required_text(value, message):
    if value is None:
        raise serializers.ValidationError(message)
    cleaned = str(value).strip()
    if not cleaned:
        raise serializers.ValidationError(message)
    return cleaned


class BroadcastMessageSerializer(serializers.Serializer):
    subject = serializers.CharField(allow_blank=True, required=False, default="")
    body = serializers.CharField(allow_blank=True, required=False, default="")
    unit_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
    )

    def validate_subject(self, value):
        return _clean_required_text(value, MessagingMessages.SUBJECT_REQUIRED)

    def validate_body(self, value):
        return _clean_required_text(value, MessagingMessages.BODY_REQUIRED)

    def validate_unit_ids(self, value):
        if value is None:
            return []
        # Preserve order while dropping duplicates so a repeated id is not an error.
        seen = set()
        cleaned = []
        for unit_id in value:
            if unit_id in seen:
                continue
            seen.add(unit_id)
            cleaned.append(unit_id)
        return cleaned


class ResidentComposeSerializer(serializers.Serializer):
    subject = serializers.CharField(allow_blank=True, required=False, default="")
    body = serializers.CharField(allow_blank=True, required=False, default="")

    def validate_subject(self, value):
        return _clean_required_text(value, MessagingMessages.SUBJECT_REQUIRED)

    def validate_body(self, value):
        return _clean_required_text(value, MessagingMessages.BODY_REQUIRED)


class ReplySerializer(serializers.Serializer):
    body = serializers.CharField(allow_blank=True, required=False, default="")

    def validate_body(self, value):
        return _clean_required_text(value, MessagingMessages.BODY_REQUIRED)


class MessageSenderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    role = serializers.CharField()


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "body", "created_at", "sender"]

    def get_sender(self, obj):
        sender = obj.sender
        return {
            "id": sender.id,
            "full_name": sender.full_name,
            "role": sender.role,
        }


def serialize_inbox_item(conversation, viewer):
    last_preview = preview_text(getattr(conversation, "last_message_body", "") or "")
    unread = int(getattr(conversation, "unread_count", 0) or 0)
    payload = {
        "id": conversation.id,
        "kind": conversation.kind,
        "subject": conversation.subject,
        "is_broadcast": conversation.is_broadcast,
        "counterpart_label": counterpart_label(conversation=conversation, viewer=viewer),
        "last_message_preview": last_preview,
        "last_message_at": conversation.last_message_at,
        "unread_count": unread,
        "created_at": conversation.created_at,
    }
    if conversation.kind == "management":
        payload["resident"] = serialize_resident_summary(conversation.resident)
        payload["resident_name"] = (
            conversation.resident.full_name if conversation.resident else ""
        )
    return payload


def serialize_thread(conversation, messages, viewer):
    return {
        "id": conversation.id,
        "kind": conversation.kind,
        "subject": conversation.subject,
        "is_broadcast": conversation.is_broadcast,
        "counterpart_label": counterpart_label(conversation=conversation, viewer=viewer),
        "resident": serialize_resident_summary(conversation.resident)
        if conversation.kind == "management"
        else None,
        "resident_name": conversation.resident.full_name
        if conversation.resident
        else "",
        "last_message_at": conversation.last_message_at,
        "created_at": conversation.created_at,
        "messages": MessageSerializer(messages, many=True).data,
    }
