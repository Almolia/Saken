from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import MessagingMessages
from users.permissions import IsManagerOrAdmin, IsResident

from .models import Conversation
from .serializers import (
    BroadcastMessageSerializer,
    ReplySerializer,
    ResidentComposeSerializer,
    serialize_inbox_item,
    serialize_thread,
)
from .services import (
    MessagingError,
    broadcast_message,
    conversation_messages,
    ensure_manager_participant,
    management_inbox_queryset,
    manager_can_access,
    mark_conversation_read,
    reply_to_conversation,
    resident_can_access,
    resident_inbox_queryset,
    send_resident_to_management,
    unread_count_for,
)


def _error_response(detail, status_code):
    return Response({"detail": detail}, status=status_code)


def _inbox_payload(conversations, viewer):
    items = [serialize_inbox_item(conversation, viewer) for conversation in conversations]
    unread_total = sum(item["unread_count"] for item in items)
    return {"conversations": items, "unread_total": unread_total}


class ManagerBroadcastView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request):
        serializer = BroadcastMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            conversations = broadcast_message(
                manager=request.user,
                subject=serializer.validated_data["subject"],
                body=serializer.validated_data["body"],
                unit_ids=serializer.validated_data.get("unit_ids") or [],
            )
        except MessagingError as error:
            return _error_response(error.detail, error.status_code)

        count = len(conversations)
        message = MessagingMessages.BROADCAST_SUCCESS_COUNT.format(count=count)
        listed = management_inbox_queryset(request.user).filter(
            pk__in=[conversation.pk for conversation in conversations]
        )
        return Response(
            {
                "message": message,
                "sent_count": count,
                "conversations": [
                    serialize_inbox_item(conversation, request.user) for conversation in listed
                ],
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerMessageListView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        conversations = management_inbox_queryset(request.user)
        return Response(_inbox_payload(conversations, request.user))


class ManagerMessageDetailView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def _get_conversation(self, request, pk):
        try:
            conversation = Conversation.objects.select_related("resident").get(pk=pk)
        except Conversation.DoesNotExist:
            return None
        if not manager_can_access(request.user, conversation):
            return None
        return conversation

    def get(self, request, pk):
        conversation = self._get_conversation(request, pk)
        if conversation is None:
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        ensure_manager_participant(conversation, request.user)
        messages = conversation_messages(conversation)
        return Response(
            {
                "conversation": serialize_thread(conversation, messages, request.user),
            }
        )

    def post(self, request, pk):
        conversation = self._get_conversation(request, pk)
        if conversation is None:
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        serializer = ReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = reply_to_conversation(
            conversation=conversation,
            sender=request.user,
            body=serializer.validated_data["body"],
        )
        conversation.refresh_from_db()
        messages = conversation_messages(conversation)
        return Response(
            {
                "message": MessagingMessages.REPLY_SUCCESS,
                "reply": {
                    "id": message.id,
                    "body": message.body,
                    "created_at": message.created_at,
                    "sender": {
                        "id": request.user.id,
                        "full_name": request.user.full_name,
                        "role": request.user.role,
                    },
                },
                "conversation": serialize_thread(conversation, messages, request.user),
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerMessageReadView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        if not manager_can_access(request.user, conversation):
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        mark_conversation_read(conversation=conversation, user=request.user)
        return Response({"message": MessagingMessages.MARKED_READ})


class ResidentMessageListCreateView(APIView):
    permission_classes = [IsResident]

    def get(self, request):
        conversations = resident_inbox_queryset(request.user)
        return Response(_inbox_payload(conversations, request.user))

    def post(self, request):
        serializer = ResidentComposeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation, _message = send_resident_to_management(
            resident=request.user,
            subject=serializer.validated_data["subject"],
            body=serializer.validated_data["body"],
        )
        conversation = resident_inbox_queryset(request.user).get(pk=conversation.pk)
        return Response(
            {
                "message": MessagingMessages.RESIDENT_SEND_SUCCESS,
                "conversation": serialize_inbox_item(conversation, request.user),
            },
            status=status.HTTP_201_CREATED,
        )


class ResidentMessageDetailView(APIView):
    permission_classes = [IsResident]

    def _get_conversation(self, request, pk):
        try:
            conversation = Conversation.objects.select_related("resident").get(pk=pk)
        except Conversation.DoesNotExist:
            return None
        if not resident_can_access(request.user, conversation):
            return None
        return conversation

    def get(self, request, pk):
        conversation = self._get_conversation(request, pk)
        if conversation is None:
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        messages = conversation_messages(conversation)
        return Response(
            {
                "conversation": serialize_thread(conversation, messages, request.user),
            }
        )

    def post(self, request, pk):
        conversation = self._get_conversation(request, pk)
        if conversation is None:
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        serializer = ReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = reply_to_conversation(
            conversation=conversation,
            sender=request.user,
            body=serializer.validated_data["body"],
        )
        conversation.refresh_from_db()
        messages = conversation_messages(conversation)
        return Response(
            {
                "message": MessagingMessages.REPLY_SUCCESS,
                "reply": {
                    "id": message.id,
                    "body": message.body,
                    "created_at": message.created_at,
                    "sender": {
                        "id": request.user.id,
                        "full_name": request.user.full_name,
                        "role": request.user.role,
                    },
                },
                "conversation": serialize_thread(conversation, messages, request.user),
            },
            status=status.HTTP_201_CREATED,
        )


class ResidentMessageReadView(APIView):
    permission_classes = [IsResident]

    def post(self, request, pk):
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        if not resident_can_access(request.user, conversation):
            return _error_response(
                MessagingMessages.CONVERSATION_NOT_FOUND,
                status.HTTP_404_NOT_FOUND,
            )
        mark_conversation_read(conversation=conversation, user=request.user)
        return Response(
            {
                "message": MessagingMessages.MARKED_READ,
                "unread_count": unread_count_for(conversation, request.user),
            }
        )


class ResidentUnreadCountView(APIView):
    permission_classes = [IsResident]

    def get(self, request):
        conversations = resident_inbox_queryset(request.user)
        unread_total = sum(int(item.unread_count or 0) for item in conversations)
        return Response({"unread_count": unread_total})
