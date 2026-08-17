from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from maintenance.models import RequestStatus, ServiceRequest
from users.models import UserRole

User = get_user_model()


class ManagerServiceRequestOrderingTests(APITestCase):
    """
    Creation-date ordering on the manager list.

    Status filtering itself is covered by ManagerReportingAndSearchTests; these
    cases cover the ?ordering= parameter and how it combines with that filter.
    """

    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09330000001',
            full_name='Ordering Manager',
            national_id='3330000001',
            role=UserRole.MANAGER,
            password='pw',
        )
        self.resident = User.objects.create_user(
            phone='09330000002',
            full_name='Ordering Resident',
            national_id='3330000002',
            role=UserRole.RESIDENT,
            password='pw',
        )
        self.staff = User.objects.create_user(
            phone='09330000003',
            full_name='Ordering Staff',
            national_id='3330000003',
            role=UserRole.SERVICE_STAFF,
            password='pw',
        )

        self.url = reverse('manager-service-request-list')
        now = timezone.now()

        # Created oldest to newest, so insertion order is the opposite of the
        # order the endpoint should answer with by default.
        self._create('Oldest pending', RequestStatus.PENDING, now - timedelta(days=3))
        self._create('Middle completed', RequestStatus.COMPLETED, now - timedelta(days=2))
        self._create('Newest assigned', RequestStatus.ASSIGNED, now - timedelta(days=1))
        self._create('Second pending', RequestStatus.PENDING, now)

        self.client.force_authenticate(user=self.manager)

    def _create(self, title, request_status, created_at):
        service_request = ServiceRequest.objects.create(
            title=title,
            description='desc',
            status=request_status,
            resident=self.resident,
            assigned_staff=self.staff if request_status != RequestStatus.PENDING else None,
        )
        # created_at is auto_now_add, so it can only be back-dated by update().
        ServiceRequest.objects.filter(pk=service_request.pk).update(created_at=created_at)
        return service_request

    def _titles(self, response):
        return [item['title'] for item in response.data['requests']]

    def test_defaults_to_newest_first(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self._titles(response),
            ['Second pending', 'Newest assigned', 'Middle completed', 'Oldest pending'],
        )

    def test_ordering_can_be_flipped_to_oldest_first(self):
        response = self.client.get(self.url, {'ordering': 'created_at'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self._titles(response),
            ['Oldest pending', 'Middle completed', 'Newest assigned', 'Second pending'],
        )

    def test_unknown_ordering_falls_back_to_newest_first(self):
        response = self.client.get(self.url, {'ordering': 'whatever'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response)[0], 'Second pending')

    def test_blank_ordering_falls_back_to_newest_first(self):
        response = self.client.get(self.url, {'ordering': '  '})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response)[0], 'Second pending')

    def test_filtered_results_keep_the_newest_first_order(self):
        response = self.client.get(self.url, {'status': RequestStatus.PENDING})

        self.assertEqual(self._titles(response), ['Second pending', 'Oldest pending'])

    def test_status_and_ordering_combine(self):
        response = self.client.get(
            self.url, {'status': RequestStatus.PENDING, 'ordering': 'created_at'}
        )

        self.assertEqual(self._titles(response), ['Oldest pending', 'Second pending'])

    def test_search_still_works_alongside_ordering(self):
        """The reports view searches this same endpoint; ordering must not break it."""
        response = self.client.get(self.url, {'search': 'Oldest', 'ordering': 'created_at'})

        self.assertEqual(self._titles(response), ['Oldest pending'])
