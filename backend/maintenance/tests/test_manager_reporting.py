from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from maintenance.models import ServiceRequest, RequestStatus
from buildings.models import Building, Unit

User = get_user_model()

class ManagerReportingAndSearchTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            phone='99988877766', full_name='The Manager', national_id='9998887776', role='manager', password='pw'
        )
        self.resident_john = User.objects.create_user(
            phone='11122233344', full_name='John Doe', national_id='1112223334', role='resident', password='pw'
        )
        self.staff_smith = User.objects.create_user(
            phone='55544433322', full_name='Agent Smith', national_id='5554443332', role='service_staff', password='pw'
        )

        self.building = Building.objects.create(name="Tower A", building_wallet_balance="0.00")
        self.unit = Unit.objects.create(
            unit_number="101", floor=1, area="50.00", building=self.building, owner=self.resident_john
        )

        ServiceRequest.objects.create(
            title="Fix sink", description="Leaking", status=RequestStatus.PENDING, resident=self.resident_john
        )
        ServiceRequest.objects.create(
            title="Fix door", description="Squeaks", status=RequestStatus.COMPLETED, resident=self.resident_john, assigned_staff=self.staff_smith
        )
        ServiceRequest.objects.create(
            title="Fix window", description="Broken", status=RequestStatus.ASSIGNED, resident=self.resident_john, assigned_staff=self.staff_smith
        )

        self.summary_url = reverse('manager-service-request-summary')
        self.list_url = reverse('manager-service-request-list')

    def test_summary_api_returns_exact_math(self):
        """Assert that the Summary API returns the exact mathematical count for each status."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.summary_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Based on our setUp, there should be exactly 1 of each
        self.assertEqual(response.data['Pending'], 1)
        self.assertEqual(response.data['Assigned'], 1)
        self.assertEqual(response.data['Completed'], 1)

    def test_search_single_term(self):
        """Single term search asserting it correctly returns only matching tasks."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {'search': 'Pending'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        requests = response.data['requests']
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]['status'], 'Pending')

    def test_advanced_search_multi_term(self):
        """Multi-term query filtering across relationships."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {'search': 'Completed Smith'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        requests = response.data['requests']
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]['status'], 'Completed')
        self.assertEqual(requests[0]['assigned_staff']['full_name'], 'Agent Smith')