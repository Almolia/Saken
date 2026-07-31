from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from maintenance.models import ServiceRequest, RequestStatus
from users.models import UserRole

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


class ManagerServiceRequestAPITests(APITestCase):
    """Tests for manager service request management endpoints."""

    def setUp(self):
        # Create users with different roles
        self.manager = User.objects.create_user(
            phone='09120000000',
            password='manager123',
            full_name='Manager User',
            national_id='1234567890',
            role=UserRole.MANAGER,
            is_staff=True,
        )

        self.admin = User.objects.create_user(
            phone='09129999999',
            password='admin123',
            full_name='Admin User',
            national_id='0987654321',
            role=UserRole.ADMIN,
            is_staff=True,
            is_superuser=True,
        )

        self.resident = User.objects.create_user(
            phone='09121111111',
            password='resident123',
            full_name='Resident User',
            national_id='1111111111',
            role=UserRole.RESIDENT,
        )

        self.service_staff = User.objects.create_user(
            phone='09122222222',
            password='staff123',
            full_name='Service Staff',
            national_id='2222222222',
            role=UserRole.SERVICE_STAFF,
        )

        self.other_service_staff = User.objects.create_user(
            phone='09123333333',
            password='staff456',
            full_name='Other Service Staff',
            national_id='3333333333',
            role=UserRole.SERVICE_STAFF,
        )

        self.resident2 = User.objects.create_user(
            phone='09124444444',
            password='resident456',
            full_name='Resident User 2',
            national_id='4444444444',
            role=UserRole.RESIDENT,
        )

        # Create service requests
        self.pending_request = ServiceRequest.objects.create(
            title="Fix Plumbing",
            description="Water leak in bathroom",
            resident=self.resident,
            status=RequestStatus.PENDING
        )

        self.assigned_request = ServiceRequest.objects.create(
            title="Fix AC",
            description="AC not cooling",
            resident=self.resident2,
            status=RequestStatus.ASSIGNED,
            assigned_staff=self.service_staff
        )

        self.completed_request = ServiceRequest.objects.create(
            title="Repair Door",
            description="Door handle broken",
            resident=self.resident,
            status=RequestStatus.COMPLETED
        )

        # URLs
        self.manager_requests_url = reverse('manager-service-request-list')
        self.manager_assign_url = reverse('manager-service-request-assign', kwargs={'pk': self.pending_request.pk})
        self.manager_update_url = reverse('manager-service-request-detail', kwargs={'pk': self.pending_request.pk})

    def test_manager_can_fetch_all_requests(self):
        """Test: Manager fetching all requests returns 200 OK with all building requests."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.manager_requests_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('requests', response.data)
        self.assertEqual(len(response.data['requests']), 3)  # All 3 requests

        # Verify request data structure
        request_data = response.data['requests']
        titles = [req['title'] for req in request_data]
        self.assertIn("Fix Plumbing", titles)
        self.assertIn("Fix AC", titles)
        self.assertIn("Repair Door", titles)

    def test_manager_can_assign_service_staff(self):
        """Test: Manager successfully assigns a pending request to service staff."""
        self.client.force_authenticate(user=self.manager)

        payload = {'staff_id': self.service_staff.id}
        response = self.client.patch(self.manager_assign_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], ServiceRequestMessages.REQUEST_ASSIGNED)

        # Verify the request was updated
        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.assigned_staff.id, self.service_staff.id)
        self.assertEqual(self.pending_request.status, RequestStatus.ASSIGNED)

    def test_manager_can_update_request_with_service_staff(self):
        """Test: Manager updates request with service staff assignment."""
        self.client.force_authenticate(user=self.manager)

        payload = {
            'assigned_staff_id': self.service_staff.id,
            'title': 'Updated Title'
        }
        response = self.client.patch(self.manager_update_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.assigned_staff.id, self.service_staff.id)
        self.assertEqual(self.pending_request.status, RequestStatus.ASSIGNED)
        self.assertEqual(self.pending_request.title, 'Updated Title')

    def test_manager_cannot_assign_to_non_service_staff_resident(self):
        """Test: Manager attempting to assign to a resident returns 400 Validation Error."""
        self.client.force_authenticate(user=self.manager)

        payload = {'staff_id': self.resident.id}  # Resident user
        response = self.client.patch(self.manager_assign_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify the request wasn't updated
        self.pending_request.refresh_from_db()
        self.assertIsNone(self.pending_request.assigned_staff)
        self.assertEqual(self.pending_request.status, RequestStatus.PENDING)

    def test_manager_cannot_assign_to_admin_user(self):
        """Test: Manager attempting to assign to an admin returns 400 Validation Error."""
        self.client.force_authenticate(user=self.manager)

        payload = {'staff_id': self.admin.id}  # Admin user
        response = self.client.patch(self.manager_assign_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify the request wasn't updated
        self.pending_request.refresh_from_db()
        self.assertIsNone(self.pending_request.assigned_staff)
        self.assertEqual(self.pending_request.status, RequestStatus.PENDING)

    def test_manager_cannot_assign_to_manager(self):
        """Test: Manager attempting to assign to another manager returns 400 Validation Error."""
        # Create another manager
        another_manager = User.objects.create_user(
            phone='09125555555',
            password='manager456',
            full_name='Another Manager',
            national_id='5555555555',
            role=UserRole.MANAGER,
            is_staff=True,
        )

        self.client.force_authenticate(user=self.manager)

        payload = {'staff_id': another_manager.id}
        response = self.client.patch(self.manager_assign_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.pending_request.refresh_from_db()
        self.assertIsNone(self.pending_request.assigned_staff)
        self.assertEqual(self.pending_request.status, RequestStatus.PENDING)

    def test_resident_cannot_access_manager_endpoints(self):
        """Test: Resident attempting to access manager endpoints receives 403 Forbidden."""
        # Test manager list endpoint
        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.manager_requests_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test manager update endpoint
        response = self.client.patch(
            self.manager_update_url,
            data={'assigned_staff_id': self.service_staff.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test manager assign endpoint
        response = self.client.patch(
            self.manager_assign_url,
            data={'staff_id': self.service_staff.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_cannot_update_assigned_request_with_different_staff(self):
        """Test: Manager cannot assign a different staff to an already assigned request."""
        self.client.force_authenticate(user=self.manager)

        # Try to update the already assigned request
        update_url = reverse('manager-service-request-detail', kwargs={'pk': self.assigned_request.pk})
        payload = {'assigned_staff_id': self.other_service_staff.id}

        response = self.client.patch(update_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assigned_request.refresh_from_db()
        self.assertEqual(self.assigned_request.assigned_staff.id, self.service_staff.id)
        self.assertEqual(self.assigned_request.status, RequestStatus.ASSIGNED)

    def test_manager_can_update_request_without_assignment(self):
        """Test: Manager can update request details without changing assignment."""
        self.client.force_authenticate(user=self.manager)

        payload = {'title': 'Updated Plumbing Issue', 'description': 'New description'}
        response = self.client.patch(self.manager_update_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.title, 'Updated Plumbing Issue')
        self.assertEqual(self.pending_request.description, 'New description')
        self.assertIsNone(self.pending_request.assigned_staff)  # Still unassigned
        self.assertEqual(self.pending_request.status, RequestStatus.PENDING)  # Status unchanged

    def test_manager_can_assign_to_service_staff_with_update_endpoint(self):
        """Test: Manager can assign service staff using the update endpoint."""
        self.client.force_authenticate(user=self.manager)

        # Use the update endpoint instead of the assign endpoint
        payload = {'assigned_staff_id': self.service_staff.id}
        response = self.client.patch(self.manager_update_url, data=payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.assigned_staff.id, self.service_staff.id)
        self.assertEqual(self.pending_request.status, RequestStatus.ASSIGNED)