from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from backend.common.constants import PollMessages
from backend.polls.models import PollStatus, Vote


def cast_vote(poll, option, resident):
    if option.poll_id != poll.id:
        raise serializers.ValidationError(PollMessages.OPTION_NOT_IN_POLL)

    if poll.status != PollStatus.ACTIVE:
        raise serializers.ValidationError(PollMessages.POLL_NOT_ACTIVE)

    if poll.ends_at < timezone.now():
        raise serializers.ValidationError(PollMessages.POLL_ENDED)

    resident_has_target_unit = poll.target_units.filter(owner=resident).exists()

    if poll.target_units.exists() and not resident_has_target_unit:
        raise serializers.ValidationError(PollMessages.RESIDENT_NOT_IN_TARGET_UNITS)

    try:
        with transaction.atomic():
            return Vote.objects.create(
                poll=poll,
                option=option,
                resident=resident,
            )
    except IntegrityError:
        raise serializers.ValidationError(PollMessages.ALREADY_VOTED)
