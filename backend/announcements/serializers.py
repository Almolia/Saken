from rest_framework import serializers
from .models import Announcement
from .validators import validate_announcement_title, validate_announcement_content


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "content",
            "author",
            "author_name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "author_name", "created_at", "updated_at"]

    def validate_title(self, value):
        return validate_announcement_title(value)

    def validate_content(self, value):
        return validate_announcement_content(value)
