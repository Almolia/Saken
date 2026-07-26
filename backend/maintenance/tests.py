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