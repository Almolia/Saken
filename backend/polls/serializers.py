from buildings.models import Unit
from common.constants import PollMessages
from django.utils import timezone
from rest_framework import serializers

from .models import Poll, PollOption, PollStatus


class PollOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollOption
        fields = ["id", "text", "position"]


class PollOptionCreateSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=255)
    position = serializers.IntegerField(required=False, default=0)


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    total_units = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = [
            "id",
            "title",
            "description",
            "status",
            "starts_at",
            "ends_at",
            "target_units",
            "options",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "total_units",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_total_units(self, obj):
        if obj.target_units.exists():
            return obj.target_units.count()
        return Unit.objects.count()


class ResidentPollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    has_voted = serializers.SerializerMethodField()
    selected_option_id = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = [
            "id",
            "title",
            "description",
            "starts_at",
            "ends_at",
            "options",
            "has_voted",
            "selected_option_id",
        ]

    def get_has_voted(self, obj):
        resident = self.context["resident"]
        return obj.votes.filter(resident=resident).exists()

    def get_selected_option_id(self, obj):
        resident = self.context["resident"]
        vote = obj.votes.filter(resident=resident).first()
        return vote.option_id if vote else None


class PollCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=PollStatus.choices, required=False, default=PollStatus.DRAFT)
    starts_at = serializers.DateTimeField(required=False, allow_null=True)
    ends_at = serializers.DateTimeField()
    target_units = serializers.PrimaryKeyRelatedField(
        queryset=Unit.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
    )
    options = PollOptionCreateSerializer(many=True, min_length=2)

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(PollMessages.TITLE_REQUIRED)
        return value

    def validate_options(self, value):
        texts = [item.get("text", "").strip() for item in value if item.get("text", "").strip()]
        if len(texts) < 2:
            raise serializers.ValidationError(PollMessages.AT_LEAST_TWO_OPTIONS)

        seen = set()
        for text in texts:
            if text in seen:
                raise serializers.ValidationError(PollMessages.DUPLICATE_OPTIONS)
            seen.add(text)
        return value

    def validate(self, attrs):
        status = attrs.get("status", PollStatus.DRAFT)
        ends_at = attrs.get("ends_at")
        starts_at = attrs.get("starts_at")

        if ends_at and ends_at <= timezone.now():
            raise serializers.ValidationError({"ends_at": PollMessages.ENDS_AT_IN_PAST})

        if status == PollStatus.ACTIVE:
            if not starts_at:
                raise serializers.ValidationError({"starts_at": PollMessages.CANNOT_PUBLISH_WITHOUT_STARTS_AT})
            if starts_at and ends_at and starts_at >= ends_at:
                raise serializers.ValidationError(
                    {"starts_at": "زمان شروع باید قبل از زمان پایان باشد."}
                )

        return attrs

    def create(self, validated_data):
        options_data = validated_data.pop("options")
        target_units = validated_data.pop("target_units", [])

        poll = Poll.objects.create(**validated_data)
        poll.target_units.set(target_units)

        for idx, option_data in enumerate(options_data):
            PollOption.objects.create(
                poll=poll,
                text=option_data["text"].strip(),
                position=option_data.get("position", idx),
            )

        return poll


class PollUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=PollStatus.choices, required=False)
    starts_at = serializers.DateTimeField(required=False, allow_null=True)
    ends_at = serializers.DateTimeField(required=False)
    target_units = serializers.PrimaryKeyRelatedField(
        queryset=Unit.objects.all(),
        many=True,
        required=False,
        allow_empty=True,
    )
    options = PollOptionCreateSerializer(many=True, required=False)

    def validate_title(self, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError(PollMessages.TITLE_REQUIRED)
        return value

    def validate_options(self, value):
        if value is not None:
            texts = [item.get("text", "").strip() for item in value if item.get("text", "").strip()]
            if len(texts) < 2:
                raise serializers.ValidationError(PollMessages.AT_LEAST_TWO_OPTIONS)
            seen = set()
            for text in texts:
                if text in seen:
                    raise serializers.ValidationError(PollMessages.DUPLICATE_OPTIONS)
                seen.add(text)
        return value

    def validate(self, attrs):
        status = attrs.get("status")
        ends_at = attrs.get("ends_at")
        starts_at = attrs.get("starts_at")

        if ends_at and ends_at <= timezone.now():
            raise serializers.ValidationError({"ends_at": PollMessages.ENDS_AT_IN_PAST})

        if status == PollStatus.ACTIVE:
            if not starts_at:
                raise serializers.ValidationError({"starts_at": PollMessages.CANNOT_PUBLISH_WITHOUT_STARTS_AT})
            if starts_at and ends_at and starts_at >= ends_at:
                raise serializers.ValidationError(
                    {"starts_at": "زمان شروع باید قبل از زمان پایان باشد."}
                )

        return attrs


class VoteCreateSerializer(serializers.Serializer):
    option_id = serializers.PrimaryKeyRelatedField(
        queryset=PollOption.objects.all(),
    )
