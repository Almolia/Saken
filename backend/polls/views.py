from buildings.models import Unit
from common.constants import PollMessages
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import IsManagerOrAdmin
from users.permissions import IsResident

from .models import Poll, PollOption, PollStatus
from .serializers import PollCreateSerializer, PollSerializer, PollUpdateSerializer, ResidentPollSerializer, \
    VoteCreateSerializer
from .services import cast_vote

# Fields the update branches below set by hand rather than through setattr:
# `status` is decided by the branch itself, `options` are rewritten as rows, and
# `target_units` is a many-to-many that Django refuses to assign directly.
DEFERRED_UPDATE_FIELDS = {"status", "options", "target_units"}


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
    DELETE: Discard a Draft poll that was never published.
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

        new_status = request.data.get("status")

        if poll.status != PollStatus.DRAFT and new_status != PollStatus.CLOSED:
            return Response(
                {"detail": PollMessages.ONLY_DRAFT_CAN_BE_EDITED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == PollStatus.CLOSED:
            if poll.status != PollStatus.ACTIVE:
                return Response(
                    {"detail": PollMessages.ONLY_ACTIVE_CAN_BE_CLOSED},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            poll.status = PollStatus.CLOSED
            poll.save()
            poll = Poll.objects.prefetch_related("options", "target_units").get(pk=poll.pk)
            return Response(
                {
                    "message": PollMessages.POLL_CLOSED,
                    "poll": PollSerializer(poll).data,
                },
                status=status.HTTP_200_OK,
            )

        if new_status == PollStatus.ACTIVE:
            if poll.status != PollStatus.DRAFT:
                return Response(
                    {"detail": PollMessages.ONLY_DRAFT_CAN_BE_PUBLISHED},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            starts_at = request.data.get("starts_at", poll.starts_at)
            ends_at = request.data.get("ends_at", poll.ends_at)

            if not starts_at:
                return Response(
                    {"detail": PollMessages.CANNOT_PUBLISH_WITHOUT_STARTS_AT},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = PollUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            validated = serializer.validated_data
            for field, value in validated.items():
                if field not in DEFERRED_UPDATE_FIELDS:
                    setattr(poll, field, value)

            poll.status = PollStatus.ACTIVE
            poll.save()

            if "target_units" in validated:
                poll.target_units.set(validated["target_units"])

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
                },
                status=status.HTTP_200_OK,
            )

        if poll.status == PollStatus.DRAFT:
            serializer = PollUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            validated = serializer.validated_data
            for field, value in validated.items():
                if field not in DEFERRED_UPDATE_FIELDS:
                    setattr(poll, field, value)
            poll.save()

            if "target_units" in validated:
                poll.target_units.set(validated["target_units"])

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
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "تغییر وضعیت درخواستی معتبر نیست."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, pk):
        poll = self.get_object(pk)
        if not poll:
            return Response(
                {"detail": PollMessages.POLL_NOT_FOUND},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only a Draft is discardable. An Active poll may already hold votes and
        # a Closed one is the record of a building decision, so both are kept and
        # a manager who wants an Active poll gone closes it instead.
        if poll.status != PollStatus.DRAFT:
            return Response(
                {"detail": PollMessages.ONLY_DRAFT_CAN_BE_DELETED},
                status=status.HTTP_400_BAD_REQUEST,
            )

        poll.delete()

        return Response(
            {"message": PollMessages.POLL_DELETED},
            status=status.HTTP_200_OK,
        )


class ResidentPollListView(APIView):
    permission_classes = [IsResident]

    def get(self, request):
        resident = request.user
        unit_ids = Unit.objects.filter(owner=resident).values_list("id", flat=True)

        polls = (
            Poll.objects
            .filter(status=PollStatus.ACTIVE, ends_at__gte=timezone.now())
            .filter(Q(target_units__isnull=True) | Q(target_units__in=unit_ids))
            .prefetch_related("options", "target_units")
            .order_by("ends_at", "id")
            .distinct()
        )

        serializer = ResidentPollSerializer(
            polls,
            many=True,
            context={"resident": resident},
        )

        return Response({"polls": serializer.data})


class ResidentPollVoteView(APIView):
    permission_classes = [IsResident]

    def post(self, request, pk):
        try:
            poll = Poll.objects.get(pk=pk)
        except Poll.DoesNotExist:
            return Response({"detail": PollMessages.POLL_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        serializer = VoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        option = serializer.validated_data["option_id"]

        cast_vote(
            poll=poll,
            option=option,
            resident=request.user,
        )

        return Response({"message": PollMessages.VOTE_SUCCESS}, status=status.HTTP_201_CREATED)
