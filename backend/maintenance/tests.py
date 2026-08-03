from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from maintenance.models import ServiceRequest

User = get_user_model()


class ResidentRequestAPITests(APITestCase):

    def setUp(self):
        self.user_a = User.objects.create_user(
            phone='09121111111',
            password='passwordA',
            full_name='Resident A',
            national_id='1111111111'
        )

        self.user_b = User.objects.create_user(
            phone='09122222222',
            password='passwordB',
            full_name='Resident B',
            national_id='2222222222'
        )

        self.request_b = ServiceRequest.objects.create(
            title="Fix AC",
            description="It is blowing warm air.",
            resident=self.user_b
        )

        self.requests_url = reverse('service-request-list')

    def test_logged_in_resident_can_create_request(self):
        """Asserts a 201 Created status and verifies the resident ID is automatically assigned."""
        self.client.force_authenticate(user=self.user_a)

        payload = {
            "title": "Leaky Faucet",
            "description": "The kitchen sink is leaking."
        }

        response = self.client.post(self.requests_url, data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['resident'], self.user_a.id)
        self.assertEqual(response.data['title'], "Leaky Faucet")
        self.assertEqual(response.data['status'], "Pending")

    def test_resident_fetching_requests_is_isolated(self):
        """Asserts a 200 OK and ensures none of Resident B's requests are returned."""
        # Create a specific request for User A
        ServiceRequest.objects.create(
            title="Lightbulb out",
            description="Hallway light needs replacing.",
            resident=self.user_a
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(self.requests_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify exactly one request is returned in the list (User A's)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Lightbulb out")

        # Explicitly verify User B's "Fix AC" request is NOT in the payload
        titles = [item['title'] for item in response.data]
        self.assertNotIn("Fix AC", titles)

    def test_unauthenticated_access_fails(self):
        """Asserts a 401/403 failure when accessing without an authentication token."""
        self.client.force_authenticate(user=None)

        # Test GET access is blocked
        response_get = self.client.get(self.requests_url)
        self.assertIn(response_get.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Test POST access is blocked
        response_post = self.client.post(self.requests_url, data={"title": "Test", "description": "Test"})
        self.assertIn(response_post.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class StaffRequestAPITests(APITestCase):

    def setUp(self):
        self.staff_a = User.objects.create_user(
            phone='33333333333', password='passwordA',
            full_name='Staff A', national_id='3333333333',
            role='service_staff'
        )
        self.staff_b = User.objects.create_user(
            phone='44444444444', password='passwordB',
            full_name='Staff B', national_id='4444444444',
            role='service_staff'
        )
        self.resident = User.objects.create_user(
            phone='55555555555', password='passwordRes',
            full_name='Resident', national_id='5555555555',
            role='resident'
        )

        # Create Mock Requests
        self.request_a = ServiceRequest.objects.create(
            title="Fix Sink", description="Leaking",
            resident=self.resident, assigned_staff=self.staff_a
        )
        self.request_b = ServiceRequest.objects.create(
            title="Fix Door", description="Squeaks",
            resident=self.resident, assigned_staff=self.staff_b
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