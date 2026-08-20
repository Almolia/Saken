from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsManagerOrAdmin
from .constants import PollMessages
from .models import Poll, PollStatus
from .serializers import PollCreateSerializer, PollSerializer, PollUpdateSerializer


class ManagerPollListCreateView(APIView):
    """
    GET: List all polls with nested options, ordered by created_at descending.
    POST: Create a new poll together with its options in a single request.
    """
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        polls = Poll.objects.prefetch_related("options", "target_units").order_by("-created_at", "-id")
        serializer = PollSerializer(polls, many=True)
        return Response({"polls": serializer.data})

    def post(self, request):
        serializer = PollCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        poll = serializer.save(created_by=request.user)

        poll = Poll.objects.prefetch_related("options", "target_units").get(pk=poll.pk)

        return Response(
            {
                "message": PollMessages.POLL_CREATED,
                "poll": PollSerializer(poll).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerPollDetailView(APIView):
    """
    GET: Get a single poll with nested options.
    PATCH: Update a Draft poll, publish it as Active, or close an Active poll.
    """
    permission_classes = [IsManagerOrAdmin]

    def get_object(self, pk):
        try:
            return Poll.objects.prefetch_related("options", "target_units").get(pk=pk)
        except Poll.DoesNotExist:
            return None

    def get(self, request, pk):
        poll = self.get_object(pk)
        if not poll:
            return Response(
                {"detail": PollMessages.POLL_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"poll": PollSerializer(poll).data})

    def patch(self, request, pk):
        poll = self.get_object(pk)
        if not poll:
            return Response(
                {"detail": PollMessages.POLL_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        if poll.status != PollStatus.DRAFT:
            return Response(
                {"detail": PollMessages.ONLY_DRAFT_CAN_BE_EDITED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PollUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        new_status = validated.get("status", poll.status)

        # Handle status transitions
        if new_status == PollStatus.ACTIVE and poll.status == PollStatus.DRAFT:
            # Publishing: validate that starts_at is set
            starts_at = validated.get("starts_at", poll.starts_at)
            ends_at = validated.get("ends_at", poll.ends_at)

            if not starts_at:
                raise serializers.ValidationError(
                    {"starts_at": PollMessages.CANNOT_PUBLISH_WITHOUT_STARTS_AT}
                )
            if starts_at >= ends_at:
                raise serializers.ValidationError(
                    {"starts_at": "زمان شروع باید قبل از زمان پایان باشد."}
                )

            # Persist changes
            for field, value in validated.items():
                setattr(poll, field, value)
            poll.status = PollStatus.ACTIVE
            poll.save()

            if "options" in validated:
                poll.options.all().delete()
                for idx, option_data in enumerate(validated["options"]):
                    PollOption.objects.create(
                        poll=poll,
                        text=option_data["text"].strip(),
                        position=option_data.get("position", idx),
                    )

            poll = Poll.objects.prefetch_related("options", "target_units").get(pk=poll.pk)
            return Response(
                {
                    "message": PollMessages.POLL_PUBLISHED,
                    "poll": PollSerializer(poll).data,
                }
            )

        elif new_status == PollStatus.CLOSED and poll.status == PollStatus.ACTIVE:
            poll.status = PollStatus.CLOSED
            poll.save()
            poll = Poll.objects.prefetch_related("options", "target_units").get(pk=poll.pk)
            return Response(
                {
                    "message": PollMessages.POLL_CLOSED,
                    "poll": PollSerializer(poll).data,
                }
            )

        elif new_status == PollStatus.DRAFT and poll.status == PollStatus.DRAFT:
            for field, value in validated.items():
                setattr(poll, field, value)
            poll.save()

            if "options" in validated:
                poll.options.all().delete()
                for idx, option_data in enumerate(validated["options"]):
                    PollOption.objects.create(
                        poll=poll,
                        text=option_data["text"].strip(),
                        position=option_data.get("position", idx),
                    )

            poll = Poll.objects.prefetch_related("options", "target_units").get(pk=poll.pk)
            return Response(
                {
                    "message": PollMessages.POLL_UPDATED,
                    "poll": PollSerializer(poll).data,
                }
            )

        else:
            raise serializers.ValidationError(
                {"status": "تغییر وضعیت درخواستی معتبر نیست."}
            )