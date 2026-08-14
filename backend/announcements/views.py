from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsManagerOrAdmin, IsResident
from .models import Announcement
from .serializers import AnnouncementSerializer


class ResidentAnnouncementListView(generics.ListAPIView):
    """
    GET: List all active announcements for residents.
    Strictly read-only - only GET is allowed.
    """
    permission_classes = [IsResident]
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        return Announcement.objects.filter(is_active=True).order_by("-created_at")


class ManagerAnnouncementListCreateView(APIView):
    """
    GET: List all announcements (managers only)
    POST: Create a new announcement (managers only)
    """
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        announcements = Announcement.objects.all().order_by("-created_at")
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response({"announcements": serializer.data})

    def post(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(
            {
                "message": "اطلاعیه با موفقیت ایجاد شد.",
                "announcement": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class ManagerAnnouncementDetailView(APIView):
    """
    GET: Get single announcement details
    PATCH: Update an announcement (managers only)
    DELETE: Delete an announcement (managers only)
    """
    permission_classes = [IsManagerOrAdmin]

    def get_object(self, pk):
        try:
            return Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return None

    def get(self, request, pk):
        announcement = self.get_object(pk)
        if not announcement:
            return Response(
                {"detail": "اطلاعیه مورد نظر یافت نشد."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AnnouncementSerializer(announcement)
        return Response(serializer.data)

    def patch(self, request, pk):
        announcement = self.get_object(pk)
        if not announcement:
            return Response(
                {"detail": "اطلاعیه مورد نظر یافت نشد."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AnnouncementSerializer(
            announcement, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": "اطلاعیه با موفقیت به‌روزرسانی شد.",
                "announcement": serializer.data,
            }
        )

    def delete(self, request, pk):
        announcement = self.get_object(pk)
        if not announcement:
            return Response(
                {"detail": "اطلاعیه مورد نظر یافت نشد."},
                status=status.HTTP_404_NOT_FOUND,
            )

        announcement.delete()
        return Response({"message": "اطلاعیه با موفقیت حذف شد."})