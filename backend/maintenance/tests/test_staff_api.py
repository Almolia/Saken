from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from maintenance.models import ServiceRequest

User = get_user_model()


class StaffRequestAPITests(APITestCase):

    def setUp(self):
        self.staff_a = User.objects.create_user(
            phone='33333333333', password='passwordA',
            full_name='Staff A', national_id='3333333333', role='service_staff'
        )
        self.staff_b = User.objects.create_user(
            phone='44444444444', password='passwordB',
            full_name='Staff B', national_id='4444444444', role='service_staff'
        )
        self.resident = User.objects.create_user(
            phone='55555555555', password='passwordRes',
            full_name='Resident', national_id='5555555555', role='resident'
        )

        self.request_a = ServiceRequest.objects.create(
            title="Fix Sink", description="Leaking", resident=self.resident, assigned_staff=self.staff_a
        )
        self.request_b = ServiceRequest.objects.create(
            title="Fix Door", description="Squeaks", resident=self.resident, assigned_staff=self.staff_b
        )

        self.list_url = reverse('staff-request-list')
        self.detail_url = reverse('staff-request-detail', kwargs={'pk': self.request_a.pk})

    def test_staff_fetching_tasks_is_isolated(self):
        """Staff A fetches their tasks, gets 200 OK, Staff B's tasks are NOT returned."""
        self.client.force_authenticate(user=self.staff_a)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Fix Sink")
        self.assertNotEqual(response.data[0]['title'], "Fix Door")

    def test_staff_submitting_work_report_transitions_status(self):
        """Staff patches work_report, asserting 200 success, text is saved, and status becomes Completed."""
        self.client.force_authenticate(user=self.staff_a)
        payload = {"work_report": "Replaced the pipe underneath."}

        response = self.client.patch(self.detail_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['work_report'], "Replaced the pipe underneath.")
        self.assertEqual(response.data['status'], "Completed")

        self.request_a.refresh_from_db()
        self.assertEqual(self.request_a.status, "Completed")
        self.assertEqual(self.request_a.work_report, "Replaced the pipe underneath.")

    def test_unauthorized_roles_cannot_patch_work_report(self):
        """A Resident attempting to use the Staff PATCH endpoint gets a 403 Forbidden."""
        self.client.force_authenticate(user=self.resident)
        payload = {"work_report": "I fixed it myself."}

        response = self.client.patch(self.detail_url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)