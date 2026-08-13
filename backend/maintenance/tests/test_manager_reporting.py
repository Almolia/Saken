from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from maintenance.models import RequestStatus, ServiceRequest
from users.models import UserRole

User = get_user_model()


class ManagerReportingAndSearchTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            phone='99988877766',
            full_name='The Manager',
            national_id='9998887776',
            role=UserRole.MANAGER,
            password='pw',
        )
        self.resident_john = User.objects.create_user(
            phone='11122233344',
            full_name='John Doe',
            national_id='1112223334',
            role=UserRole.RESIDENT,
            password='pw',
        )
        self.staff_smith = User.objects.create_user(
            phone='55544433322',
            full_name='Agent Smith',
            national_id='5554443332',
            role=UserRole.SERVICE_STAFF,
            password='pw',
        )

        self.building = Building.objects.create(
            name='Tower A',
            building_wallet_balance='0.00',
        )
        self.unit = Unit.objects.create(
            unit_number='101',
            floor=1,
            area='50.00',
            building=self.building,
            owner=self.resident_john,
        )

        self.pending_request = ServiceRequest.objects.create(
            title='Fix sink',
            description='Leaking',
            status=RequestStatus.PENDING,
            resident=self.resident_john,
        )
        self.completed_request = ServiceRequest.objects.create(
            title='Fix door',
            description='Squeaks',
            status=RequestStatus.COMPLETED,
            resident=self.resident_john,
            assigned_staff=self.staff_smith,
        )
        self.assigned_request = ServiceRequest.objects.create(
            title='Fix window',
            description='Broken',
            status=RequestStatus.ASSIGNED,
            resident=self.resident_john,
            assigned_staff=self.staff_smith,
        )

        self.summary_url = reverse('manager-service-request-summary')
        self.list_url = reverse('manager-service-request-list')

    def test_summary_api_returns_exact_math(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.summary_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {
            RequestStatus.PENDING: 1,
            RequestStatus.ASSIGNED: 1,
            RequestStatus.COMPLETED: 1,
        })

    def test_summary_includes_zero_for_every_known_status(self):
        ServiceRequest.objects.exclude(status=RequestStatus.PENDING).delete()
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.summary_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[RequestStatus.PENDING], 1)
        self.assertEqual(response.data[RequestStatus.ASSIGNED], 0)
        self.assertEqual(response.data[RequestStatus.COMPLETED], 0)

    def test_search_single_term(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.list_url, {'search': 'Pending'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        requests = response.data['requests']
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]['id'], self.pending_request.id)

    def test_advanced_search_allows_terms_to_match_different_relations(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(
            self.list_url,
            {'search': 'Completed Smith 101'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        requests = response.data['requests']
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]['id'], self.completed_request.id)
        self.assertEqual(requests[0]['assigned_staff']['full_name'], 'Agent Smith')

    def test_global_search_covers_resident_and_staff_phone_values(self):
        self.client.force_authenticate(user=self.manager)

        resident_response = self.client.get(
            self.list_url,
            {'search': self.resident_john.phone},
        )
        staff_response = self.client.get(
            self.list_url,
            {'search': self.staff_smith.phone},
        )

        self.assertEqual(resident_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resident_response.data['requests']), 3)
        self.assertEqual(staff_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(staff_response.data['requests']), 2)

    def test_manager_request_list_contains_every_report_column(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        requests = response.data['requests']
        self.assertEqual(len(requests), 3)
        for service_request in requests:
            self.assertEqual(service_request['unit_number'], '101')
            self.assertIn('resident', service_request)
            self.assertIn('assigned_staff', service_request)
            self.assertIn('status', service_request)
            self.assertIn('created_at', service_request)
            self.assertIsNotNone(service_request['created_at'])

    def test_no_match_returns_an_empty_requests_envelope(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.list_url, {'search': 'does-not-exist'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'requests': []})

    def test_resident_cannot_access_manager_reports(self):
        self.client.force_authenticate(user=self.resident_john)

        summary_response = self.client.get(self.summary_url)
        list_response = self.client.get(self.list_url)

        self.assertEqual(summary_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
