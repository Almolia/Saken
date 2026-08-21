from common.constants import PollMessages
from django.db import IntegrityError, transaction
from django.utils import timezone
from polls.models import PollStatus, Vote
from rest_framework import serializers
from django.db.models import Count


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


def get_poll_results(poll):
    total_votes = poll.votes.count()

    # Annotate counts directly in SQL, avoiding memory overload
    options = poll.options.annotate(vote_count=Count('votes')).order_by('position', 'id')

    results = []
    for option in options:
        percentage = round((option.vote_count / total_votes * 100), 1) if total_votes > 0 else 0.0
        results.append({
            "id": option.id,
            "text": option.text,
            "vote_count": option.vote_count,
            "percentage": percentage,
        })

    return {
        "total_votes": total_votes,
        "options": results
    }