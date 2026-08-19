from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from common.constants import MessagingMessages
from messaging.models import Conversation, ConversationKind, Message
from users.models import UserRole

User = get_user_model()


class BroadcastMessagingTests(APITestCase):
    def setUp(self):
        Building.objects.create(name="برج تست پیام")
        self.manager_a = User.objects.create_user(
            phone="09120000001",
            password="ManagerA123",
            full_name="مدیر الف",
            national_id="1000000001",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.manager_b = User.objects.create_user(
            phone="09120000002",
            password="ManagerB123",
            full_name="مدیر ب",
            national_id="1000000002",
            role=UserRole.MANAGER,
            is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone="09120000011",
            password="ResidentA123",
            full_name="ساکن الف",
            national_id="1000000011",
            role=UserRole.RESIDENT,
        )
        self.resident_b = User.objects.create_user(
            phone="09120000012",
            password="ResidentB123",
            full_name="ساکن ب",
            national_id="1000000012",
            role=UserRole.RESIDENT,
        )
        self.resident_c = User.objects.create_user(
            phone="09120000013",
            password="ResidentC123",
            full_name="ساکن ج",
            national_id="1000000013",
            role=UserRole.RESIDENT,
        )
        self.staff = User.objects.create_user(
            phone="09120000021",
            password="Staff12345",
            full_name="کارمند خدمات",
            national_id="1000000021",
            role=UserRole.SERVICE_STAFF,
        )
        self.unit_a = Unit.objects.create(
            owner=self.resident_a,
            unit_number="101",
            floor=1,
            area="80.00",
        )
        self.unit_b = Unit.objects.create(
            owner=self.resident_b,
            unit_number="102",
            floor=1,
            area="85.00",
        )
        self.unit_c = Unit.objects.create(
            owner=self.resident_c,
            unit_number="201",
            floor=2,
            area="90.00",
        )
        self.vacant = Unit.objects.create(
            owner=None,
            unit_number="301",
            floor=3,
            area="70.00",
        )
        self.broadcast_url = reverse("manager-message-broadcast")
        self.list_url = reverse("manager-messages")

    def _thread_url(self, conversation_id):
        return reverse("manager-message-detail", kwargs={"pk": conversation_id})

    def test_manager_broadcast_to_all_residents_creates_management_threads(self):
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.broadcast_url,
            {
                "subject": "قطع آب",
                "body": "آب ساختمان فردا از ساعت ۹ قطع است.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["message"],
            MessagingMessages.BROADCAST_SUCCESS_COUNT.format(count=3),
        )
        self.assertEqual(response.data["sent_count"], 3)

        for resident in (self.resident_a, self.resident_b, self.resident_c):
            conversation = Conversation.objects.get(
                kind=ConversationKind.MANAGEMENT,
                resident=resident,
            )
            self.assertTrue(conversation.is_broadcast)
            self.assertEqual(
                conversation.messages.filter(sender=self.manager_a).count(),
                1,
            )
            self.assertEqual(
                conversation.messages.first().body,
                "آب ساختمان فردا از ساعت ۹ قطع است.",
            )
            self.assertTrue(
                conversation.participants.filter(
                    user=resident,
                    is_management_resident=True,
                ).exists()
            )

        self.assertEqual(Conversation.objects.count(), 3)
        self.assertFalse(
            Conversation.objects.filter(resident=self.staff).exists()
        )

        self.client.force_authenticate(user=self.resident_a)
        forbidden = self.client.post(
            self.broadcast_url,
            {"subject": "هک", "body": "نباید ارسال شود"},
            format="json",
        )
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Conversation.objects.count(), 3)
        self.assertEqual(Message.objects.count(), 3)

    def test_broadcast_to_subset_of_units_skips_other_residents(self):
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.broadcast_url,
            {
                "subject": "تعمیر آسانسور",
                "body": "آسانسور واحدهای طبقه اول فردا سرویس می‌شود.",
                "unit_ids": [self.unit_a.id, self.unit_b.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sent_count"], 2)
        self.assertTrue(
            Conversation.objects.filter(
                kind=ConversationKind.MANAGEMENT,
                resident=self.resident_a,
            ).exists()
        )
        self.assertTrue(
            Conversation.objects.filter(
                kind=ConversationKind.MANAGEMENT,
                resident=self.resident_b,
            ).exists()
        )
        self.assertFalse(
            Conversation.objects.filter(resident=self.resident_c).exists()
        )
        self.assertEqual(Conversation.objects.count(), 2)

    def test_empty_unit_list_targets_every_owned_unit_and_skips_vacant(self):
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.broadcast_url,
            {
                "subject": "اطلاعیه عمومی",
                "body": "این پیام برای همه ساکنان است.",
                "unit_ids": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sent_count"], 3)
        self.assertEqual(
            set(Conversation.objects.values_list("resident_id", flat=True)),
            {self.resident_a.id, self.resident_b.id, self.resident_c.id},
        )

    def test_manager_b_can_read_and_reply_to_manager_a_broadcast(self):
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            self.broadcast_url,
            {"subject": "جلسه ساختمان", "body": "جلسه پنجشنبه برگزار می‌شود."},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident_a)

        self.client.force_authenticate(user=self.manager_b)
        listed = self.client.get(self.list_url)
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        listed_ids = [item["id"] for item in listed.data["conversations"]]
        self.assertIn(conversation.id, listed_ids)
        listed_item = next(
            item for item in listed.data["conversations"] if item["id"] == conversation.id
        )
        self.assertEqual(listed_item["resident_name"], "ساکن الف")
        self.assertEqual(listed_item["counterpart_label"], "ساکن الف")
        self.assertGreaterEqual(listed_item["unread_count"], 1)

        detail = self.client.get(self._thread_url(conversation.id))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        bodies = [item["body"] for item in detail.data["conversation"]["messages"]]
        self.assertIn("جلسه پنجشنبه برگزار می‌شود.", bodies)

        reply = self.client.post(
            self._thread_url(conversation.id),
            {"body": "ساعت جلسه به ۱۸ تغییر کرد."},
            format="json",
        )
        self.assertEqual(reply.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reply.data["message"], MessagingMessages.REPLY_SUCCESS)

        self.client.force_authenticate(user=self.resident_a)
        inbox = self.client.get(reverse("resident-messages"))
        self.assertEqual(inbox.status_code, status.HTTP_200_OK)
        self.assertEqual(len(inbox.data["conversations"]), 1)
        self.assertIn(
            "ساعت جلسه به ۱۸ تغییر کرد.",
            inbox.data["conversations"][0]["last_message_preview"],
        )

        thread = self.client.get(
            reverse("resident-message-detail", kwargs={"pk": conversation.id})
        )
        self.assertEqual(thread.status_code, status.HTTP_200_OK)
        resident_bodies = [item["body"] for item in thread.data["conversation"]["messages"]]
        self.assertIn("ساعت جلسه به ۱۸ تغییر کرد.", resident_bodies)
        self.assertEqual(thread.data["conversation"]["counterpart_label"], "مدیریت ساختمان")

    def test_resident_reply_is_isolated_to_that_resident_thread(self):
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            self.broadcast_url,
            {"subject": "همگانی", "body": "پیام اولیه مدیر"},
            format="json",
        )
        thread_a = Conversation.objects.get(resident=self.resident_a)
        thread_b = Conversation.objects.get(resident=self.resident_b)

        self.client.force_authenticate(user=self.resident_a)
        reply = self.client.post(
            reverse("resident-message-detail", kwargs={"pk": thread_a.id}),
            {"body": "پاسخ خصوصی ساکن الف"},
            format="json",
        )
        self.assertEqual(reply.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            Message.objects.filter(
                conversation=thread_a,
                body="پاسخ خصوصی ساکن الف",
            ).exists()
        )
        self.assertFalse(
            Message.objects.filter(
                conversation=thread_b,
                body="پاسخ خصوصی ساکن الف",
            ).exists()
        )

        for manager in (self.manager_a, self.manager_b):
            self.client.force_authenticate(user=manager)
            detail_a = self.client.get(self._thread_url(thread_a.id))
            self.assertEqual(detail_a.status_code, status.HTTP_200_OK)
            bodies_a = [item["body"] for item in detail_a.data["conversation"]["messages"]]
            self.assertIn("پاسخ خصوصی ساکن الف", bodies_a)

            detail_b = self.client.get(self._thread_url(thread_b.id))
            bodies_b = [item["body"] for item in detail_b.data["conversation"]["messages"]]
            self.assertNotIn("پاسخ خصوصی ساکن الف", bodies_b)

    def test_service_staff_is_forbidden_on_every_manager_messaging_endpoint(self):
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            self.broadcast_url,
            {"subject": "موضوع", "body": "متن"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident_a)

        self.client.force_authenticate(user=self.staff)
        self.assertEqual(
            self.client.post(
                self.broadcast_url,
                {"subject": "x", "body": "y"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.get(self._thread_url(conversation.id)).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                self._thread_url(conversation.id),
                {"body": "نباید ارسال شود"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                reverse("manager-message-read", kwargs={"pk": conversation.id}),
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_broadcast_rejects_empty_subject_and_body(self):
        self.client.force_authenticate(user=self.manager_a)
        for payload in (
            {"subject": "   ", "body": "متن معتبر"},
            {"subject": "موضوع معتبر", "body": "   "},
            {"body": "بدون موضوع"},
            {"subject": "بدون متن"},
        ):
            response = self.client.post(self.broadcast_url, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Conversation.objects.count(), 0)
        self.assertEqual(Message.objects.count(), 0)

    def test_broadcast_reuses_existing_management_conversation(self):
        self.client.force_authenticate(user=self.resident_a)
        created = self.client.post(
            reverse("resident-messages"),
            {"subject": "سوال ساکن", "body": "شیر آب چکه می‌کند."},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        conversation_id = created.data["conversation"]["id"]

        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.broadcast_url,
            {
                "subject": "پیام همگانی",
                "body": "اطلاعیه جدید مدیریت",
                "unit_ids": [self.unit_a.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Conversation.objects.filter(resident=self.resident_a).count(),
            1,
        )
        conversation = Conversation.objects.get(pk=conversation_id)
        self.assertTrue(conversation.is_broadcast)
        self.assertEqual(conversation.messages.count(), 2)

    def test_unknown_unit_ids_are_rejected(self):
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.post(
            self.broadcast_url,
            {
                "subject": "موضوع",
                "body": "متن",
                "unit_ids": [self.unit_a.id, 99999],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], MessagingMessages.INVALID_UNITS)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_manager_reply_rejects_empty_body(self):
        self.client.force_authenticate(user=self.manager_a)
        self.client.post(
            self.broadcast_url,
            {"subject": "موضوع", "body": "متن اولیه"},
            format="json",
        )
        conversation = Conversation.objects.get(resident=self.resident_a)
        response = self.client.post(
            self._thread_url(conversation.id),
            {"body": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(conversation.messages.count(), 1)
