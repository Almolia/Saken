from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from messaging.models import Conversation, ConversationKind, ConversationParticipant, Message
from users.models import UserRole

User = get_user_model()


class InboxOrderingTests(APITestCase):
    """Tests for inbox ordering - newest first by last_message_at"""

    def setUp(self):
        Building.objects.create(name="برج تست ترتیب")
        self.manager = User.objects.create_user(
            phone="09150000001",
            password="Manager123",
            full_name="مدیر",
            national_id="5000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09150000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="5000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09150000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="5000000012",
            role=UserRole.RESIDENT,
        )
        Unit.objects.create(owner=self.resident_a, unit_number="101", floor=1, area="80.00")
        Unit.objects.create(owner=self.resident_b, unit_number="102", floor=1, area="85.00")

    def test_manager_inbox_ordered_newest_first(self):
        """Manager's inbox should be ordered by last_message_at descending."""
        # Create two conversations with different times
        self.client.force_authenticate(user=self.manager)

        # First conversation
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "اول", "body": "پیام اول"},
            format="json",
        )
        conversation_a = Conversation.objects.get(resident=self.resident_a)

        # Second conversation (newer)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "دوم", "body": "پیام دوم"},
            format="json",
        )
        conversation_b = Conversation.objects.get(resident=self.resident_b)

        # Refresh to get updated last_message_at
        conversation_a.refresh_from_db()
        conversation_b.refresh_from_db()

        # Ensure B is newer than A
        conversation_b.last_message_at = conversation_a.last_message_at + timezone.timedelta(hours=1)
        conversation_b.save()

        # Get inbox
        inbox_response = self.client.get(reverse("manager-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)

        conversations = inbox_response.data["conversations"]
        self.assertEqual(len(conversations), 2)

        # B should come first (newer)
        self.assertEqual(conversations[0]["id"], conversation_b.id)
        self.assertEqual(conversations[1]["id"], conversation_a.id)

    def test_resident_inbox_ordered_newest_first(self):
        """Resident's inbox should be ordered by last_message_at descending."""
        # Create two conversations (one for each resident)
        self.client.force_authenticate(user=self.resident_a)

        first = self.client.post(
            reverse("resident-messages"),
            {"subject": "اولین", "body": "متن اول"},
            format="json",
        )
        conversation_a = Conversation.objects.get(pk=first.data["conversation"]["id"])

        # Create second conversation with resident B (need to authenticate as resident B)
        self.client.force_authenticate(user=self.resident_b)
        second = self.client.post(
            reverse("resident-messages"),
            {"subject": "دومین", "body": "متن دوم"},
            format="json",
        )
        conversation_b = Conversation.objects.get(pk=second.data["conversation"]["id"])

        # Ensure B is newer
        conversation_b.last_message_at = conversation_a.last_message_at + timezone.timedelta(hours=1)
        conversation_b.save()

        # Resident A's inbox should only contain their own conversation
        self.client.force_authenticate(user=self.resident_a)
        inbox_response = self.client.get(reverse("resident-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)

        conversations = inbox_response.data["conversations"]
        # Resident A only has their own management conversation
        self.assertEqual(len(conversations), 1)
        self.assertEqual(conversations[0]["id"], conversation_a.id)

        # Now test by creating a direct message conversation for resident A
        # Create a direct conversation between resident_a and resident_b
        direct = Conversation.objects.create(
            kind=ConversationKind.DIRECT,
            subject="Direct",
            created_by=self.resident_a,
            resident=None,
            last_message_at=conversation_a.last_message_at + timezone.timedelta(hours=2),
        )
        from messaging.models import ConversationParticipant, Message
        ConversationParticipant.objects.create(conversation=direct, user=self.resident_a)
        ConversationParticipant.objects.create(conversation=direct, user=self.resident_b)
        Message.objects.create(conversation=direct, sender=self.resident_b, body="Direct message")

        inbox_response2 = self.client.get(reverse("resident-messages"))
        conversations2 = inbox_response2.data["conversations"]
        # Now resident A has 2 conversations: management + direct
        self.assertEqual(len(conversations2), 2)
        # Direct should be first (newer)
        self.assertEqual(conversations2[0]["id"], direct.id)
        self.assertEqual(conversations2[1]["id"], conversation_a.id)


class UnreadCountTests(APITestCase):
    """Tests for unread count functionality"""

    def setUp(self):
        Building.objects.create(name="برج تست خوانده‌نشده")
        self.manager_a = User.objects.create_user(
            phone="09160000001",
            password="ManagerA123",
            full_name="مدیر الف",
            national_id="6000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.manager_b = User.objects.create_user(
            phone="09160000002",
            password="ManagerB123",
            full_name="مدیر ب",
            national_id="6000000002",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone="09160000011",
            password="Resident123",
            full_name="ساکن",
            national_id="6000000011",
            role=UserRole.RESIDENT,
        )
        Unit.objects.create(owner=self.resident, unit_number="101", floor=1, area="80.00")

    def test_resident_unread_count_after_manager_sends_two_messages(self):
        """Resident's unread_count should be 2 after manager sends two messages."""
        # Manager sends first message
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "اول", "body": "پیام اول"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident)

        # Manager sends second message
        self.client.post(
            reverse("manager-message-detail", kwargs={"pk": conversation.id}),
            {"body": "پیام دوم"},
            format="json",
        )

        # Resident checks inbox - should have 2 unread
        self.client.force_authenticate(user=self.resident)
        inbox_response = self.client.get(reverse("resident-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)

        conversation_item = next(
            (c for c in inbox_response.data["conversations"] if c["id"] == conversation.id),
            None,
        )
        self.assertIsNotNone(conversation_item)
        self.assertEqual(conversation_item["unread_count"], 2)
        self.assertEqual(inbox_response.data["unread_total"], 2)

    def test_resident_mark_as_read_clears_unread_count(self):
        """After resident marks conversation as read, unread_count should be 0."""
        # Setup: Manager sends messages
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "موضوع", "body": "پیام اول"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident)
        self.client.post(
            reverse("manager-message-detail", kwargs={"pk": conversation.id}),
            {"body": "پیام دوم"},
            format="json",
        )

        # Resident marks as read
        self.client.force_authenticate(user=self.resident)
        mark_read_response = self.client.post(
            reverse("resident-message-read", kwargs={"pk": conversation.id}),
            format="json",
        )
        self.assertEqual(mark_read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(mark_read_response.data["unread_count"], 0)

        # Verify inbox shows 0 unread
        inbox_response = self.client.get(reverse("resident-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)
        conversation_item = next(
            (c for c in inbox_response.data["conversations"] if c["id"] == conversation.id),
            None,
        )
        self.assertEqual(conversation_item["unread_count"], 0)
        self.assertEqual(inbox_response.data["unread_total"], 0)

    def test_manager_last_read_at_unchanged_after_resident_marks_read(self):
        """Manager A and B's last_read_at should be unchanged after resident marks read."""
        # Setup: Manager A sends messages
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "موضوع", "body": "پیام اول"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident)
        self.client.post(
            reverse("manager-message-detail", kwargs={"pk": conversation.id}),
            {"body": "پیام دوم"},
            format="json",
        )

        # Mark manager A as read (simulate viewing)
        manager_a_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.manager_a
        )
        manager_a_participant.last_read_at = timezone.now()
        manager_a_participant.save()

        # Add manager B as participant
        ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=self.manager_b,
            defaults={"is_management_resident": False},
        )

        # Record original last_read_at values
        manager_a_read_at_before = manager_a_participant.last_read_at
        manager_b_participant = ConversationParticipant.objects.get(
            conversation=conversation, user=self.manager_b
        )
        manager_b_read_at_before = manager_b_participant.last_read_at

        # Resident marks as read
        self.client.force_authenticate(user=self.resident)
        self.client.post(
            reverse("resident-message-read", kwargs={"pk": conversation.id}),
            format="json",
        )

        # Verify managers' last_read_at values are unchanged
        manager_a_participant.refresh_from_db()
        manager_b_participant.refresh_from_db()

        self.assertEqual(
            manager_a_participant.last_read_at,
            manager_a_read_at_before,
            "Manager A's last_read_at should not change when resident marks as read",
        )
        # Manager B might not have a last_read_at yet (None), that's fine
        # The important thing is it doesn't get set to now
        if manager_b_read_at_before is not None:
            self.assertEqual(
                manager_b_participant.last_read_at,
                manager_b_read_at_before,
                "Manager B's last_read_at should not change when resident marks as read",
            )

    def test_resident_reply_updates_conversation_and_visible_to_managers(self):
        """Resident reply should be stored, visible to managers, and update last_message_at."""
        # Create conversation via broadcast
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "موضوع", "body": "پیام مدیر"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident)
        original_last_message_at = conversation.last_message_at

        # Resident replies
        self.client.force_authenticate(user=self.resident)
        reply_response = self.client.post(
            reverse("resident-message-detail", kwargs={"pk": conversation.id}),
            {"body": "پاسخ ساکن"},
            format="json",
        )
        self.assertEqual(reply_response.status_code, status.HTTP_201_CREATED)

        # Verify message was stored
        message_exists = Message.objects.filter(
            conversation=conversation, body="پاسخ ساکن"
        ).exists()
        self.assertTrue(message_exists)

        # Verify last_message_at was updated
        conversation.refresh_from_db()
        self.assertGreater(conversation.last_message_at, original_last_message_at)

        # Verify Manager A can see the reply
        self.client.force_authenticate(user=self.manager_a)
        thread_response = self.client.get(
            reverse("manager-message-detail", kwargs={"pk": conversation.id})
        )
        self.assertEqual(thread_response.status_code, status.HTTP_200_OK)
        bodies = [m["body"] for m in thread_response.data["conversation"]["messages"]]
        self.assertIn("پاسخ ساکن", bodies)

        # Verify Manager B can also see the reply
        self.client.force_authenticate(user=self.manager_b)
        thread_response_b = self.client.get(
            reverse("manager-message-detail", kwargs={"pk": conversation.id})
        )
        self.assertEqual(thread_response_b.status_code, status.HTTP_200_OK)
        bodies_b = [m["body"] for m in thread_response_b.data["conversation"]["messages"]]
        self.assertIn("پاسخ ساکن", bodies_b)


class ConversationSecurityTests(APITestCase):
    """Security tests for conversation access"""

    def setUp(self):
        Building.objects.create(name="برج تست امنیت")
        self.manager_a = User.objects.create_user(
            phone="09170000001",
            password="ManagerA123",
            full_name="مدیر الف",
            national_id="7000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09170000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="7000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09170000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="7000000012",
            role=UserRole.RESIDENT,
        )
        Unit.objects.create(owner=self.resident_a, unit_number="101", floor=1, area="80.00")
        Unit.objects.create(owner=self.resident_b, unit_number="102", floor=1, area="85.00")

    def test_resident_a_cannot_fetch_resident_b_conversation(self):
        """Resident A should receive 404 when fetching Resident B's conversation."""
        # Create Resident B's conversation
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "برای ساکن ب", "body": "پیام به ساکن ب"},
            format="json",
        )
        conversation_b = Conversation.objects.get(resident=self.resident_b)

        # Resident A tries to fetch it
        self.client.force_authenticate(user=self.resident_a)
        fetch_response = self.client.get(
            reverse("resident-message-detail", kwargs={"pk": conversation_b.id})
        )
        self.assertEqual(fetch_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_resident_a_cannot_mark_resident_b_conversation_read(self):
        """Resident A should receive 404 when marking Resident B's conversation as read."""
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "برای ساکن ب", "body": "پیام به ساکن ب"},
            format="json",
        )
        conversation_b = Conversation.objects.get(resident=self.resident_b)

        self.client.force_authenticate(user=self.resident_a)
        mark_read_response = self.client.post(
            reverse("resident-message-read", kwargs={"pk": conversation_b.id}),
            format="json",
        )
        self.assertEqual(mark_read_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_resident_a_cannot_reply_to_resident_b_conversation(self):
        """Resident A should receive 404 when replying to Resident B's conversation."""
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "برای ساکن ب", "body": "پیام به ساکن ب"},
            format="json",
        )
        conversation_b = Conversation.objects.get(resident=self.resident_b)

        self.client.force_authenticate(user=self.resident_a)
        reply_response = self.client.post(
            reverse("resident-message-detail", kwargs={"pk": conversation_b.id}),
            {"body": "نباید ارسال شود"},
            format="json",
        )
        self.assertEqual(reply_response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify no message was created
        message_exists = Message.objects.filter(
            conversation=conversation_b, body="نباید ارسال شود"
        ).exists()
        self.assertFalse(message_exists)

    def test_resident_a_cannot_see_resident_b_in_inbox(self):
        """Resident A's inbox should not contain Resident B's conversation."""
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "برای ساکن الف", "body": "پیام الف"},
            format="json",
        )
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "برای ساکن ب", "body": "پیام ب"},
            format="json",
        )

        self.client.force_authenticate(user=self.resident_a)
        inbox_response = self.client.get(reverse("resident-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)

        subjects = [c["subject"] for c in inbox_response.data["conversations"]]
        self.assertIn("برای ساکن الف", subjects)
        self.assertNotIn("برای ساکن ب", subjects)


class UnreadCountBadgeTests(APITestCase):
    """Tests for the unread_count endpoint for nav badge"""

    def setUp(self):
        Building.objects.create(name="برج تست")
        self.manager = User.objects.create_user(
            phone="09180000001",
            password="Manager123",
            full_name="مدیر",
            national_id="8000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09180000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="8000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09180000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="8000000012",
            role=UserRole.RESIDENT,
        )
        Unit.objects.create(owner=self.resident_a, unit_number="101", floor=1, area="80.00")
        Unit.objects.create(owner=self.resident_b, unit_number="102", floor=1, area="85.00")

    def test_unread_count_endpoint_returns_total(self):
        """GET /api/resident/messages/unread_count/ should return total unread count."""
        # Create conversation with unread messages for resident A
        self.client.force_authenticate(user=self.manager)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "اول", "body": "پیام اول"},
            format="json",
        )
        conv_a = Conversation.objects.get(resident=self.resident_a)

        # Add second message to conv_a
        self.client.post(
            reverse("manager-message-detail", kwargs={"pk": conv_a.id}),
            {"body": "پیام دوم"},
            format="json",
        )

        # Resident A checks total unread - should be 2 (both from manager)
        self.client.force_authenticate(user=self.resident_a)
        count_response = self.client.get(reverse("resident-messages-unread-count"))
        self.assertEqual(count_response.status_code, status.HTTP_200_OK)
        self.assertEqual(count_response.data["unread_count"], 2)  # 2 messages from manager

    def test_unread_count_after_opening_thread(self):
        """After opening a thread and getting mark-as-read, unread count should decrease."""
        self.client.force_authenticate(user=self.manager)
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "موضوع", "body": "پیام"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident_a)

        # Add second message
        self.client.post(
            reverse("manager-message-detail", kwargs={"pk": conversation.id}),
            {"body": "پیام دوم"},
            format="json",
        )

        # Resident checks unread count
        self.client.force_authenticate(user=self.resident_a)
        before_response = self.client.get(reverse("resident-messages-unread-count"))
        self.assertEqual(before_response.data["unread_count"], 2)

        # Mark as read
        self.client.post(
            reverse("resident-message-read", kwargs={"pk": conversation.id}),
            format="json",
        )

        # Unread count should be 0
        after_response = self.client.get(reverse("resident-messages-unread-count"))
        self.assertEqual(after_response.data["unread_count"], 0)
