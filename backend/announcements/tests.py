from datetime import timedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserRole
from .models import Announcement

User = get_user_model()


class AnnouncementResidentTests(APITestCase):
    """Tests for resident announcement endpoints."""

    def setUp(self):
        self.resident = User.objects.create_user(
            phone="09121110001",
            password="ResidentPass123",
            full_name="Test Resident",
            national_id="1111111111",
            role=UserRole.RESIDENT,
        )
        self.manager = User.objects.create_user(
            phone="09121110002",
            password="ManagerPass123",
            full_name="Test Manager",
            national_id="1111111112",
            role=UserRole.MANAGER,
            is_staff=True,
        )

        self.url = reverse("resident-announcements")

        now = timezone.now()

        self.announcement_old = Announcement.objects.create(
            title="Old Announcement",
            content="This is an old announcement",
            author=self.manager,
            is_active=True,
        )
        Announcement.objects.filter(pk=self.announcement_old.pk).update(
            created_at=now - timedelta(days=2)
        )
        self.announcement_old.refresh_from_db()

        self.announcement_mid = Announcement.objects.create(
            title="Mid Announcement",
            content="This is a mid announcement",
            author=self.manager,
            is_active=True,
        )
        Announcement.objects.filter(pk=self.announcement_mid.pk).update(
            created_at=now - timedelta(days=1)
        )
        self.announcement_mid.refresh_from_db()

        self.announcement_new = Announcement.objects.create(
            title="New Announcement",
            content="This is the newest announcement",
            author=self.manager,
            is_active=True,
        )
        Announcement.objects.filter(pk=self.announcement_new.pk).update(
            created_at=now
        )
        self.announcement_new.refresh_from_db()

        self.announcement_inactive = Announcement.objects.create(
            title="Inactive Announcement",
            content="This announcement is inactive",
            author=self.manager,
            is_active=False,
        )
        Announcement.objects.filter(pk=self.announcement_inactive.pk).update(
            created_at=now
        )
        self.announcement_inactive.refresh_from_db()

    def test_resident_can_list_active_announcements(self):
        """Resident can GET active announcements."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # Only active announcements

    def test_announcements_sorted_newest_first(self):
        """Test sorting logic: newest announcement appears at index [0]."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        self.assertEqual(response.data[0]["title"], "New Announcement")
        self.assertEqual(response.data[0]["id"], self.announcement_new.id)

        self.assertEqual(response.data[1]["title"], "Mid Announcement")
        self.assertEqual(response.data[1]["id"], self.announcement_mid.id)

        self.assertEqual(response.data[2]["title"], "Old Announcement")
        self.assertEqual(response.data[2]["id"], self.announcement_old.id)

        created_ats = [item["created_at"] for item in response.data]
        self.assertEqual(
            created_ats,
            sorted(created_ats, reverse=True),
            "Timestamps should be in descending order",
        )

    def test_inactive_announcements_excluded(self):
        """Test filtering: is_active=False announcements are NOT included."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify inactive announcement is not in response
        response_ids = [item["id"] for item in response.data]
        self.assertNotIn(self.announcement_inactive.id, response_ids)

        # Verify all returned announcements are active
        for item in response.data:
            self.assertTrue(item["is_active"])

    def test_resident_cannot_create_announcement(self):
        """
        Security test: Resident attempting POST gets 405 Method Not Allowed.
        The ListAPIView doesn't support POST at all, which is correct.
        """
        self.client.force_authenticate(user=self.resident)

        payload = {
            "title": "Resident's Announcement",
            "content": "Resident trying to create announcement",
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(Announcement.objects.count(), 4)  # No new announcement created

    def test_resident_cannot_update_announcement(self):
        """Security test: Resident attempting PATCH gets 405 Method Not Allowed."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.patch(
            self.url, {"title": "Hacked"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_resident_cannot_delete_announcement(self):
        """Security test: Resident attempting DELETE gets 405 Method Not Allowed."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_unauthenticated_access_rejected(self):
        """Unauthenticated users cannot access announcements."""
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )


class ManagerAnnouncementTests(APITestCase):
    """Tests for manager announcement management endpoints."""

    def setUp(self):
        self.manager = User.objects.create_user(
            phone="09121110003",
            password="ManagerPass123",
            full_name="Test Manager",
            national_id="1111111113",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone="09121110004",
            password="ResidentPass123",
            full_name="Test Resident",
            national_id="1111111114",
            role=UserRole.RESIDENT,
        )

        self.list_url = reverse("manager-announcements")

    def test_manager_can_create_announcement(self):
        """Manager can POST a new announcement."""
        self.client.force_authenticate(user=self.manager)

        payload = {
            "title": "Important Building Notice",
            "content": "The lobby will be closed for renovations this weekend.",
        }
        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "اطلاعیه با موفقیت ایجاد شد.")
        self.assertEqual(response.data["announcement"]["title"], "Important Building Notice")
        self.assertEqual(response.data["announcement"]["content"], "The lobby will be closed for renovations this weekend.")
        self.assertEqual(response.data["announcement"]["author"], self.manager.id)
        self.assertEqual(response.data["announcement"]["author_name"], self.manager.full_name)

        self.assertEqual(Announcement.objects.count(), 1)
        announcement = Announcement.objects.first()
        self.assertEqual(announcement.author, self.manager)

    def test_manager_can_list_all_announcements(self):
        """Manager can GET all announcements (including inactive)."""
        self.client.force_authenticate(user=self.manager)

        Announcement.objects.create(
            title="Active 1", content="Content 1", author=self.manager, is_active=True
        )
        Announcement.objects.create(
            title="Active 2", content="Content 2", author=self.manager, is_active=True
        )
        Announcement.objects.create(
            title="Inactive", content="Content 3", author=self.manager, is_active=False
        )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["announcements"]), 3)

    def test_manager_can_update_announcement(self):
        """Manager can PATCH an announcement."""
        self.client.force_authenticate(user=self.manager)

        announcement = Announcement.objects.create(
            title="Original Title",
            content="Original content",
            author=self.manager,
        )
        detail_url = reverse("manager-announcement-detail", kwargs={"pk": announcement.pk})

        payload = {"title": "Updated Title", "is_active": False}
        response = self.client.patch(detail_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "اطلاعیه با موفقیت به‌روزرسانی شد.")
        self.assertEqual(response.data["announcement"]["title"], "Updated Title")
        self.assertFalse(response.data["announcement"]["is_active"])

        announcement.refresh_from_db()
        self.assertEqual(announcement.title, "Updated Title")
        self.assertFalse(announcement.is_active)

    def test_manager_can_delete_announcement(self):
        """Manager can DELETE an announcement."""
        self.client.force_authenticate(user=self.manager)

        announcement = Announcement.objects.create(
            title="To Delete", content="Delete me", author=self.manager
        )
        detail_url = reverse("manager-announcement-detail", kwargs={"pk": announcement.pk})

        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "اطلاعیه با موفقیت حذف شد.")
        self.assertEqual(Announcement.objects.count(), 0)

    def test_manager_can_get_single_announcement(self):
        """Manager can GET a single announcement."""
        self.client.force_authenticate(user=self.manager)

        announcement = Announcement.objects.create(
            title="Single Announcement",
            content="Single content",
            author=self.manager,
        )
        detail_url = reverse("manager-announcement-detail", kwargs={"pk": announcement.pk})

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Single Announcement")
        self.assertEqual(response.data["content"], "Single content")

    def test_resident_cannot_access_manager_endpoints(self):
        """Resident cannot access manager announcement endpoints."""
        self.client.force_authenticate(user=self.resident)

        payload = {"title": "Hack", "content": "Hack content"}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_announcement_detail_404_returns_proper_message(self):
        """GET on non-existent announcement returns 404 with proper message."""
        self.client.force_authenticate(user=self.manager)

        detail_url = reverse("manager-announcement-detail", kwargs={"pk": 99999})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "اطلاعیه مورد نظر یافت نشد.")

    def test_announcement_serializer_contains_author_name(self):
        """Serializer includes author_name from author.full_name."""
        self.client.force_authenticate(user=self.manager)

        announcement = Announcement.objects.create(
            title="Test", content="Test content", author=self.manager
        )
        detail_url = reverse("manager-announcement-detail", kwargs={"pk": announcement.pk})

        response = self.client.get(detail_url)

        self.assertEqual(response.data["author_name"], self.manager.full_name)


class AnnouncementModelTests(APITestCase):
    """Tests for the Announcement model itself."""

    def setUp(self):
        self.manager = User.objects.create_user(
            phone="09121110005",
            password="ManagerPass123",
            full_name="Test Manager 2",
            national_id="1111111115",
            role=UserRole.MANAGER,
            is_staff=True,
        )

    def test_announcement_str_method(self):
        """Test the __str__ method returns the title."""
        announcement = Announcement.objects.create(
            title="Test Announcement",
            content="Test content",
            author=self.manager,
        )
        self.assertEqual(str(announcement), "Test Announcement")

    def test_announcement_default_is_active_true(self):
        """Test is_active defaults to True."""
        announcement = Announcement.objects.create(
            title="Test Announcement",
            content="Test content",
            author=self.manager,
        )
        self.assertTrue(announcement.is_active)

    def test_announcement_ordering(self):
        """Test the default ordering is by -created_at."""
        now = timezone.now()

        a1 = Announcement.objects.create(
            title="First", content="First", author=self.manager
        )
        Announcement.objects.filter(pk=a1.pk).update(
            created_at=now - timedelta(days=2)
        )
        a1.refresh_from_db()

        a2 = Announcement.objects.create(
            title="Second", content="Second", author=self.manager
        )
        Announcement.objects.filter(pk=a2.pk).update(
            created_at=now - timedelta(days=1)
        )
        a2.refresh_from_db()

        a3 = Announcement.objects.create(
            title="Third", content="Third", author=self.manager
        )
        Announcement.objects.filter(pk=a3.pk).update(
            created_at=now
        )
        a3.refresh_from_db()

        announcements = Announcement.objects.all()
        self.assertEqual(announcements[0].title, "Third")
        self.assertEqual(announcements[1].title, "Second")
        self.assertEqual(announcements[2].title, "First")

    def test_announcement_author_nullable(self):
        """Test that author can be null."""
        announcement = Announcement.objects.create(
            title="No Author",
            content="Content without author",
            author=None,
        )
        self.assertIsNone(announcement.author)
        self.assertEqual(str(announcement), "No Author")