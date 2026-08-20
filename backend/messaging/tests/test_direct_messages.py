from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from common.constants import MessagingMessages
from messaging.models import Conversation, ConversationKind, ConversationParticipant, Message
from users.models import UserRole

User = get_user_model()


class RecipientsAPITests(APITestCase):
    """Tests for GET /api/messages/recipients/"""

    def setUp(self):
        Building.objects.create(name="برج تست")
        self.manager = User.objects.create_user(
            phone="09130000001",
            password="Manager123",
            full_name="مدیر اصلی",
            national_id="3000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.manager_b = User.objects.create_user(
            phone="09130000002",
            password="ManagerB123",
            full_name="مدیر دوم",
            national_id="3000000002",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09130000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="3000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09130000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="3000000012",
            role=UserRole.RESIDENT,
        )
        self.inactive_resident = User.objects.create_user(
            phone="09130000013",
            password="Inactive123",
            full_name="ساکن غیرفعال",
            national_id="3000000013",
            role=UserRole.RESIDENT,
            is_active=False,
        )
        self.staff = User.objects.create_user(
            phone="09130000021",
            password="Staff12345",
            full_name="کارمند خدمات",
            national_id="3000000021",
            role=UserRole.SERVICE_STAFF,
        )
        Unit.objects.create(owner=self.resident_a, unit_number="101", floor=1, area="80.00")
        Unit.objects.create(owner=self.resident_b, unit_number="102", floor=1, area="85.00")
        self.url = reverse("message-recipients")

    def test_authenticated_manager_can_list_recipients(self):
        """Manager should see all active residents and other managers (not self, not staff)."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        recipients = response.data["recipients"]
        recipient_ids = [r["id"] for r in recipients]
        recipient_roles = {r["role"] for r in recipients}

        # Should include resident_a, resident_b, manager_b
        self.assertIn(self.resident_a.id, recipient_ids)
        self.assertIn(self.resident_b.id, recipient_ids)
        self.assertIn(self.manager_b.id, recipient_ids)

        # Should NOT include self
        self.assertNotIn(self.manager.id, recipient_ids)

        # Should NOT include staff
        self.assertNotIn(self.staff.id, recipient_ids)

        # Should NOT include inactive
        self.assertNotIn(self.inactive_resident.id, recipient_ids)

        # All should have required fields
        for recipient in recipients:
            self.assertIn("id", recipient)
            self.assertIn("full_name", recipient)
            self.assertIn("role", recipient)

    def test_authenticated_resident_can_list_recipients(self):
        """Resident should see all active residents and managers (not self, not staff)."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        recipients = response.data["recipients"]
        recipient_ids = [r["id"] for r in recipients]

        # Should include resident_b, manager, manager_b
        self.assertIn(self.resident_b.id, recipient_ids)
        self.assertIn(self.manager.id, recipient_ids)
        self.assertIn(self.manager_b.id, recipient_ids)

        # Should NOT include self
        self.assertNotIn(self.resident_a.id, recipient_ids)

        # Should NOT include staff
        self.assertNotIn(self.staff.id, recipient_ids)

    def test_service_staff_cannot_list_recipients(self):
        """Service staff should receive 403 Forbidden."""
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_recipients(self):
        """Unauthenticated user should receive 401 Unauthorized."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DirectMessageAPITests(APITestCase):
    """Tests for POST /api/messages/direct/"""

    def setUp(self):
        Building.objects.create(name="برج تست")
        self.manager_a = User.objects.create_user(
            phone="09140000001",
            password="ManagerA123",
            full_name="مدیر الف",
            national_id="4000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.manager_b = User.objects.create_user(
            phone="09140000002",
            password="ManagerB123",
            full_name="مدیر ب",
            national_id="4000000002",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09140000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="4000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09140000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="4000000012",
            role=UserRole.RESIDENT,
        )
        self.inactive_resident = User.objects.create_user(
            phone="09140000013",
            password="Inactive123",
            full_name="ساکن غیرفعال",
            national_id="4000000013",
            role=UserRole.RESIDENT,
            is_active=False,
        )
        self.staff = User.objects.create_user(
            phone="09140000021",
            password="Staff12345",
            full_name="کارمند خدمات",
            national_id="4000000021",
            role=UserRole.SERVICE_STAFF,
        )
        Unit.objects.create(owner=self.resident_a, unit_number="101", floor=1, area="80.00")
        Unit.objects.create(owner=self.resident_b, unit_number="102", floor=1, area="85.00")
        self.url = reverse("message-direct")

    def _thread_url(self, conversation_id):
        return reverse("manager-message-detail", kwargs={"pk": conversation_id})

    def test_resident_a_can_send_direct_message_to_resident_b(self):
        """Resident A should be able to send a direct message to Resident B."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {
                "user_id": self.resident_b.id,
                "subject": "سلام",
                "body": "سلام، چطوری؟",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["conversation"]["kind"], ConversationKind.DIRECT)

        # Verify conversation was created
        conversation_id = response.data["conversation"]["id"]
        conversation = Conversation.objects.get(pk=conversation_id)

        self.assertEqual(conversation.kind, ConversationKind.DIRECT)
        self.assertIsNone(conversation.resident)
        self.assertEqual(conversation.subject, "سلام")

        # Verify exactly two participants
        participants = conversation.participants.all()
        self.assertEqual(participants.count(), 2)
        participant_user_ids = {p.user_id for p in participants}
        self.assertIn(self.resident_a.id, participant_user_ids)
        self.assertIn(self.resident_b.id, participant_user_ids)

        # Verify message was created
        message = conversation.messages.first()
        self.assertEqual(message.sender, self.resident_a)
        self.assertEqual(message.body, "سلام، چطوری؟")

    def test_resident_can_send_direct_message_to_manager(self):
        """Resident should be able to send a direct message to a manager."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {
                "user_id": self.manager_a.id,
                "subject": "سوال",
                "body": "یه سوال دارم",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conversation = Conversation.objects.get(pk=response.data["conversation"]["id"])
        self.assertEqual(conversation.kind, ConversationKind.DIRECT)
        self.assertEqual(conversation.participants.count(), 2)

    def test_manager_a_can_send_direct_message_to_resident_b(self):
        """Manager A should be able to send a direct message to Resident B."""
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.url,
            {
                "user_id": self.resident_b.id,
                "subject": "اطلاعیه",
                "body": "لطفا شارژ ماهانه را پرداخت کنید.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conversation = Conversation.objects.get(pk=response.data["conversation"]["id"])
        self.assertEqual(conversation.kind, ConversationKind.DIRECT)
        self.assertEqual(conversation.participants.count(), 2)

    def test_reusing_existing_direct_conversation(self):
        """Second direct message between same pair should reuse existing conversation."""
        self.client.force_authenticate(user=self.resident_a)

        # First message
        response1 = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "اول", "body": "پیام اول"},
            format="json",
        )
        first_id = response1.data["conversation"]["id"]

        # Second message
        response2 = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "دوم", "body": "پیام دوم"},
            format="json",
        )
        second_id = response2.data["conversation"]["id"]

        # Should reuse the same conversation
        self.assertEqual(first_id, second_id)

        # Should still have only one conversation
        self.assertEqual(Conversation.objects.filter(kind=ConversationKind.DIRECT).count(), 1)

        # Should have two messages
        conversation = Conversation.objects.get(pk=first_id)
        self.assertEqual(conversation.messages.count(), 2)

    def test_resident_a_can_reply_to_resident_b_direct_message(self):
        """After creating a direct conversation, both can reply to it."""
        self.client.force_authenticate(user=self.resident_a)
        create_response = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "بحث", "body": "پیام اول"},
            format="json",
        )
        conversation_id = create_response.data["conversation"]["id"]

        # Resident B replies
        self.client.force_authenticate(user=self.resident_b)
        reply_response = self.client.post(
            reverse("resident-message-detail", kwargs={"pk": conversation_id}),
            {"body": "پاسخ ب"},
            format="json",
        )
        self.assertEqual(reply_response.status_code, status.HTTP_201_CREATED)

        # Verify both can see the thread
        self.client.force_authenticate(user=self.resident_a)
        thread_response = self.client.get(
            reverse("resident-message-detail", kwargs={"pk": conversation_id})
        )
        self.assertEqual(thread_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(thread_response.data["conversation"]["messages"]), 2)

    def test_manager_cannot_see_direct_conversation_between_residents(self):
        """A manager should NOT see direct conversations between residents."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "خصوصی", "body": "فقط برای ما"},
            format="json",
        )
        conversation_id = response.data["conversation"]["id"]

        # Manager A tries to see the conversation
        self.client.force_authenticate(user=self.manager_a)
        thread_response = self.client.get(self._thread_url(conversation_id))
        self.assertEqual(thread_response.status_code, status.HTTP_404_NOT_FOUND)

        # Manager A's inbox should NOT contain this conversation
        inbox_response = self.client.get(reverse("manager-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)
        conversation_ids = [c["id"] for c in inbox_response.data["conversations"]]
        self.assertNotIn(conversation_id, conversation_ids)

    def test_manager_b_cannot_see_direct_conversation_from_manager_a_to_resident(self):
        """Manager B should not see direct conversation between Manager A and Resident A."""
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.url,
            {"user_id": self.resident_a.id, "subject": "خصوصی", "body": "فقط برای من و ساکن"},
            format="json",
        )
        conversation_id = response.data["conversation"]["id"]

        # Manager B tries to see the conversation
        self.client.force_authenticate(user=self.manager_b)
        thread_response = self.client.get(self._thread_url(conversation_id))
        self.assertEqual(thread_response.status_code, status.HTTP_404_NOT_FOUND)

        # Manager B's inbox should NOT contain this conversation
        inbox_response = self.client.get(reverse("manager-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)
        conversation_ids = [c["id"] for c in inbox_response.data["conversations"]]
        self.assertNotIn(conversation_id, conversation_ids)

    def test_resident_b_still_sees_shared_management_conversation(self):
        """Resident B should still see their management conversation with managers."""
        # Create management conversation
        self.client.force_authenticate(user=self.manager_a)
        from django.urls import reverse
        self.client.post(
            reverse("manager-message-broadcast"),
            {"subject": "همگانی", "body": "پیام مدیر"},
            format="json",
        )
        management_conversation = Conversation.objects.filter(resident=self.resident_b).first()

        # Create direct conversation
        self.client.force_authenticate(user=self.manager_a)
        direct_response = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "خصوصی", "body": "پیام مستقیم"},
            format="json",
        )

        # Resident B should see both in their inbox
        self.client.force_authenticate(user=self.resident_b)
        inbox_response = self.client.get(reverse("resident-messages"))
        self.assertEqual(inbox_response.status_code, status.HTTP_200_OK)
        conversation_ids = [c["id"] for c in inbox_response.data["conversations"]]
        self.assertIn(management_conversation.id, conversation_ids)
        self.assertIn(direct_response.data["conversation"]["id"], conversation_ids)

    def test_cannot_message_yourself(self):
        """User should not be able to send a direct message to themselves."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"user_id": self.resident_a.id, "subject": "خطا", "body": "نباید کار کنه"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_message_service_staff(self):
        """User should not be able to send a direct message to service staff."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"user_id": self.staff.id, "subject": "خطا", "body": "نباید کار کنه"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_message_inactive_user(self):
        """User should not be able to send a direct message to inactive user."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"user_id": self.inactive_resident.id, "subject": "خطا", "body": "نباید کار کنه"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_subject_rejected(self):
        """Empty or whitespace-only subject should be rejected."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "   ", "body": "متن معتبر"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_body_rejected(self):
        """Empty or whitespace-only body should be rejected."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"user_id": self.resident_b.id, "subject": "موضوع معتبر", "body": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_user_id_rejected(self):
        """Missing user_id should be rejected."""
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.url,
            {"subject": "موضوع", "body": "متن"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_service_staff_cannot_send_direct_message(self):
        """Service staff should receive 403 Forbidden."""
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            self.url,
            {"user_id": self.resident_a.id, "subject": "خطا", "body": "نباید کار کنه"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_send_direct_message(self):
        """Unauthenticated user should receive 401 Unauthorized."""
        response = self.client.post(
            self.url,
            {"user_id": self.resident_a.id, "subject": "خطا", "body": "نباید کار کنه"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
