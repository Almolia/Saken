from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from common.constants import MessagingMessages
from messaging.models import Conversation, ConversationKind, Message
from users.models import UserRole

User = get_user_model()


class ResidentMessagingTests(APITestCase):
    def setUp(self):
        Building.objects.create(name="برج تست پیام ساکن")
        self.manager_a = User.objects.create_user(
            phone="09121000001",
            password="ManagerA123",
            full_name="مدیر الف",
            national_id="2000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.manager_b = User.objects.create_user(
            phone="09121000002",
            password="ManagerB123",
            full_name="مدیر ب",
            national_id="2000000002",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09121000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="2000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09121000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="2000000012",
            role=UserRole.RESIDENT,
        )
        self.staff = User.objects.create_user(
            phone="09121000021",
            password="Staff12345",
            full_name="کارمند خدمات",
            national_id="2000000021",
            role=UserRole.SERVICE_STAFF,
        )
        Unit.objects.create(
            owner=self.resident_a,
            unit_number="101",
            floor=1,
            area="80.00",
        )
        Unit.objects.create(
            owner=self.resident_b,
            unit_number="102",
            floor=1,
            area="85.00",
        )
        self.send_url = reverse("resident-messages")

    def test_resident_send_creates_shared_management_thread(self):
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.post(
            self.send_url,
            {
                "subject": "نشتی سقف",
                "body": "سقف واحد ۱۰۱ نشتی دارد.",
                "recipient_id": self.resident_b.id,
                "recipient": self.manager_a.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], MessagingMessages.RESIDENT_SEND_SUCCESS)
        self.assertEqual(response.data["conversation"]["kind"], ConversationKind.MANAGEMENT)
        self.assertEqual(
            response.data["conversation"]["counterpart_label"],
            "مدیریت ساختمان",
        )

        conversation = Conversation.objects.get()
        self.assertEqual(conversation.kind, ConversationKind.MANAGEMENT)
        self.assertEqual(conversation.resident, self.resident_a)
        self.assertNotEqual(conversation.resident, self.resident_b)
        self.assertEqual(conversation.messages.get().body, "سقف واحد ۱۰۱ نشتی دارد.")

        for manager in (self.manager_a, self.manager_b):
            self.client.force_authenticate(user=manager)
            listed = self.client.get(reverse("manager-messages"))
            self.assertEqual(listed.status_code, status.HTTP_200_OK)
            self.assertEqual(len(listed.data["conversations"]), 1)
            item = listed.data["conversations"][0]
            self.assertEqual(item["id"], conversation.id)
            self.assertEqual(item["resident_name"], "ساکن الف")
            self.assertEqual(item["subject"], "نشتی سقف")
            self.assertGreaterEqual(item["unread_count"], 1)

    def test_resident_inbox_never_contains_another_residents_thread(self):
        self.client.force_authenticate(user=self.resident_a)
        self.client.post(
            self.send_url,
            {"subject": "پیام الف", "body": "متن الف"},
            format="json",
        )
        self.client.force_authenticate(user=self.resident_b)
        self.client.post(
            self.send_url,
            {"subject": "پیام ب", "body": "متن ب"},
            format="json",
        )

        thread_a = Conversation.objects.get(resident=self.resident_a)
        thread_b = Conversation.objects.get(resident=self.resident_b)

        self.client.force_authenticate(user=self.resident_a)
        inbox = self.client.get(self.send_url)
        self.assertEqual(inbox.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in inbox.data["conversations"]]
        self.assertEqual(ids, [thread_a.id])
        self.assertNotIn(thread_b.id, ids)

        foreign = self.client.get(
            reverse("resident-message-detail", kwargs={"pk": thread_b.id})
        )
        self.assertEqual(foreign.status_code, status.HTTP_404_NOT_FOUND)

        foreign_reply = self.client.post(
            reverse("resident-message-detail", kwargs={"pk": thread_b.id}),
            {"body": "نباید دیده شود"},
            format="json",
        )
        self.assertEqual(foreign_reply.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(
            Message.objects.filter(conversation=thread_b, body="نباید دیده شود").exists()
        )

    def test_empty_subject_and_body_are_rejected_and_store_nothing(self):
        self.client.force_authenticate(user=self.resident_a)

        empty_subject = self.client.post(
            self.send_url,
            {"subject": "   ", "body": "متن معتبر"},
            format="json",
        )
        self.assertEqual(empty_subject.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            empty_subject.data["subject"][0],
            MessagingMessages.SUBJECT_REQUIRED,
        )

        empty_body = self.client.post(
            self.send_url,
            {"subject": "موضوع معتبر", "body": "   "},
            format="json",
        )
        self.assertEqual(empty_body.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(empty_body.data["body"][0], MessagingMessages.BODY_REQUIRED)

        missing_subject = self.client.post(
            self.send_url,
            {"body": "بدون موضوع"},
            format="json",
        )
        self.assertEqual(missing_subject.status_code, status.HTTP_400_BAD_REQUEST)

        missing_body = self.client.post(
            self.send_url,
            {"subject": "بدون متن"},
            format="json",
        )
        self.assertEqual(missing_body.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(Conversation.objects.count(), 0)
        self.assertEqual(Message.objects.count(), 0)

    def test_manager_and_staff_cannot_use_resident_messaging_endpoints(self):
        self.client.force_authenticate(user=self.manager_a)
        manager_send = self.client.post(
            self.send_url,
            {"subject": "نباید", "body": "ارسال شود"},
            format="json",
        )
        self.assertEqual(manager_send.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.staff)
        staff_send = self.client.post(
            self.send_url,
            {"subject": "نباید", "body": "ارسال شود"},
            format="json",
        )
        self.assertEqual(staff_send.status_code, status.HTTP_403_FORBIDDEN)
        staff_list = self.client.get(self.send_url)
        self.assertEqual(staff_list.status_code, status.HTTP_403_FORBIDDEN)

        self.assertEqual(Conversation.objects.count(), 0)
        self.assertEqual(Message.objects.count(), 0)

    def test_resident_reuses_the_same_management_conversation(self):
        self.client.force_authenticate(user=self.resident_a)
        first = self.client.post(
            self.send_url,
            {"subject": "اولین پیام", "body": "متن اول"},
            format="json",
        )
        second = self.client.post(
            self.send_url,
            {"subject": "دومین پیام", "body": "متن دوم"},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            first.data["conversation"]["id"],
            second.data["conversation"]["id"],
        )
        self.assertEqual(Conversation.objects.filter(resident=self.resident_a).count(), 1)
        self.assertEqual(Message.objects.count(), 2)

    def test_unread_count_excludes_own_messages_and_clears_after_read(self):
        self.client.force_authenticate(user=self.resident_a)
        created = self.client.post(
            self.send_url,
            {"subject": "سوال", "body": "پیام ساکن"},
            format="json",
        )
        conversation_id = created.data["conversation"]["id"]
        self.assertEqual(created.data["conversation"]["unread_count"], 0)

        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            reverse("manager-message-detail", kwargs={"pk": conversation_id}),
            {"body": "پاسخ مدیر"},
            format="json",
        )

        self.client.force_authenticate(user=self.resident_a)
        inbox = self.client.get(self.send_url)
        self.assertEqual(inbox.data["conversations"][0]["unread_count"], 1)
        self.assertEqual(inbox.data["unread_total"], 1)

        marked = self.client.post(
            reverse("resident-message-read", kwargs={"pk": conversation_id}),
            format="json",
        )
        self.assertEqual(marked.status_code, status.HTTP_200_OK)
        self.assertEqual(marked.data["unread_count"], 0)

        inbox_after = self.client.get(self.send_url)
        self.assertEqual(inbox_after.data["conversations"][0]["unread_count"], 0)
        self.assertEqual(inbox_after.data["unread_total"], 0)

    def test_inbox_is_ordered_newest_last_message_first(self):
        self.client.force_authenticate(user=self.resident_a)
        first = self.client.post(
            self.send_url,
            {"subject": "قدیمی", "body": "اول"},
            format="json",
        )
        self.client.force_authenticate(user=self.resident_b)
        second = self.client.post(
            self.send_url,
            {"subject": "جدیدتر", "body": "دوم"},
            format="json",
        )

        self.client.force_authenticate(user=self.manager_a)
        listed = self.client.get(reverse("manager-messages"))
        subjects = [item["subject"] for item in listed.data["conversations"]]
        self.assertEqual(subjects[0], second.data["conversation"]["subject"])
        self.assertEqual(subjects[1], first.data["conversation"]["subject"])
