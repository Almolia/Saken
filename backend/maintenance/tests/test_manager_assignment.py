from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from common.constants import ServiceRequestMessages
from maintenance.models import RequestStatus, ServiceRequest
from users.models import UserRole
from users.permissions import IsManager

User = get_user_model()


class ManagerAssignmentAPITests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09120001001', password='Manager123',
            full_name='مدیر ساختمان', national_id='1234501001',
            role=UserRole.MANAGER, is_staff=True,
        )
        self.admin = User.objects.create_user(
            phone='09120001002', password='Admin1234',
            full_name='ادمین سیستم', national_id='1234501002',
            role=UserRole.ADMIN, is_staff=True, is_superuser=True,
        )
        self.resident = User.objects.create_user(
            phone='09120001003', password='Resident123',
            full_name='سارا احمدی', national_id='1234501003',
            role=UserRole.RESIDENT,
        )
        self.other_resident = User.objects.create_user(
            phone='09120001004', password='Resident123',
            full_name='رضا کریمی', national_id='1234501004',
            role=UserRole.RESIDENT,
        )
        self.staff = User.objects.create_user(
            phone='09120001005', password='Service123',
            full_name='متین محمودی', national_id='1234501005',
            role=UserRole.SERVICE_STAFF,
        )

        self.request_a = ServiceRequest.objects.create(
            title='نشتی آب', description='لوله حمام چکه می‌کند.',
            resident=self.resident,
        )
        self.request_b = ServiceRequest.objects.create(
            title='تعمیر آسانسور', description='آسانسور متوقف می‌شود.',
            resident=self.other_resident,
        )

        self.list_url = reverse('manager-service-request-list')
        self.update_url = reverse(
            'manager-service-request-update', kwargs={'pk': self.request_a.pk}
        )
        self.assign_url = reverse(
            'manager-service-request-assign', kwargs={'pk': self.request_a.pk}
        )

    def test_list_and_update_views_use_ismanager(self):
        from maintenance.views import (
            ManagerServiceRequestListView,
            ManagerServiceRequestUpdateView,
        )

        self.assertIn(IsManager, ManagerServiceRequestListView.permission_classes)
        self.assertIn(IsManager, ManagerServiceRequestUpdateView.permission_classes)

    def test_manager_fetching_all_requests_returns_200_and_every_building_request(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        requests = response.data['requests']
        self.assertEqual(len(requests), 2)
        self.assertEqual(
            {item['title'] for item in requests},
            {'نشتی آب', 'تعمیر آسانسور'},
        )
        self.assertEqual(
            {item['id'] for item in requests},
            {self.request_a.pk, self.request_b.pk},
        )

    def test_manager_assigning_to_service_staff_returns_200_and_sets_assigned(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.update_url,
            {'assigned_staff_id': self.staff.pk},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['request']['status'], RequestStatus.ASSIGNED)
        self.assertEqual(response.data['request']['assigned_staff']['id'], self.staff.pk)
        self.request_a.refresh_from_db()
        self.assertEqual(self.request_a.assigned_staff, self.staff)
        self.assertEqual(self.request_a.status, RequestStatus.ASSIGNED)

    def test_manager_cannot_assign_to_resident_or_admin(self):
        self.client.force_authenticate(user=self.manager)

        for target in (self.resident, self.admin, self.manager):
            response = self.client.patch(
                self.update_url,
                {'assigned_staff_id': target.pk},
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(ServiceRequestMessages.STAFF_INVALID_ROLE, str(response.data))

        self.request_a.refresh_from_db()
        self.assertIsNone(self.request_a.assigned_staff)
        self.assertEqual(self.request_a.status, RequestStatus.PENDING)

    def test_resident_cannot_access_manager_assignment_endpoints(self):
        self.client.force_authenticate(user=self.resident)

        list_response = self.client.get(self.list_url)
        update_response = self.client.patch(
            self.update_url,
            {'assigned_staff_id': self.staff.pk},
            format='json',
        )
        assign_response = self.client.patch(
            self.assign_url,
            {'assigned_staff_id': self.staff.pk},
            format='json',
        )

        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(assign_response.status_code, status.HTTP_403_FORBIDDEN)
        self.request_a.refresh_from_db()
        self.assertIsNone(self.request_a.assigned_staff)
