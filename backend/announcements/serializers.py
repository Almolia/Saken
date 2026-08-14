from rest_framework import serializers
from .models import Announcement


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