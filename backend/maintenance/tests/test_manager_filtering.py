from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from maintenance.models import RequestStatus, ServiceRequest
from users.models import UserRole

User = get_user_model()


class ManagerServiceRequestFilterTests(APITestCase):
    """Status filtering and creation-date ordering on the manager list."""

    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09330000001',
            full_name='Filter Manager',
            national_id='3330000001',
            role=UserRole.MANAGER,
            password='pw',
        )
        self.resident = User.objects.create_user(
            phone='09330000002',
            full_name='Filter Resident',
            national_id='3330000002',
            role=UserRole.RESIDENT,
            password='pw',
        )
        self.staff = User.objects.create_user(
            phone='09330000003',
            full_name='Filter Staff',
            national_id='3330000003',
            role=UserRole.SERVICE_STAFF,
            password='pw',
        )

        self.url = reverse('manager-service-request-list')
        now = timezone.now()

        # Created oldest to newest, so insertion order is the opposite of the
        # order the endpoint should answer with by default.
        self.oldest = self._create('Oldest pending', RequestStatus.PENDING, now - timedelta(days=3))
        self.middle = self._create('Middle completed', RequestStatus.COMPLETED, now - timedelta(days=2))
        self.newest = self._create('Newest assigned', RequestStatus.ASSIGNED, now - timedelta(days=1))
        self.second_pending = self._create('Second pending', RequestStatus.PENDING, now)

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
        service_request.refresh_from_db()
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

    def test_filters_by_status(self):
        response = self.client.get(self.url, {'status': RequestStatus.PENDING})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), ['Second pending', 'Oldest pending'])

    def test_status_filter_is_case_insensitive(self):
        """The acceptance criteria spells the value lowercase (?status=pending)."""
        response = self.client.get(self.url, {'status': 'pending'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), ['Second pending', 'Oldest pending'])

    def test_each_status_returns_only_its_own_requests(self):
        for request_status, expected in (
            (RequestStatus.ASSIGNED, ['Newest assigned']),
            (RequestStatus.COMPLETED, ['Middle completed']),
        ):
            with self.subTest(status=request_status):
                response = self.client.get(self.url, {'status': request_status})
                self.assertEqual(self._titles(response), expected)

    def test_filtered_results_keep_the_newest_first_order(self):
        response = self.client.get(self.url, {'status': RequestStatus.PENDING})

        returned = [item['created_at'] for item in response.data['requests']]
        self.assertEqual(returned, sorted(returned, reverse=True))

    def test_unknown_status_returns_an_empty_list(self):
        response = self.client.get(self.url, {'status': 'not-a-status'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['requests'], [])

    def test_blank_status_is_ignored(self):
        response = self.client.get(self.url, {'status': '  '})

        self.assertEqual(len(response.data['requests']), 4)

    def test_ordering_can_be_flipped_to_oldest_first(self):
        response = self.client.get(self.url, {'ordering': 'created_at'})

        self.assertEqual(
            self._titles(response),
            ['Oldest pending', 'Middle completed', 'Newest assigned', 'Second pending'],
        )

    def test_unknown_ordering_falls_back_to_newest_first(self):
        response = self.client.get(self.url, {'ordering': 'whatever'})

        self.assertEqual(self._titles(response)[0], 'Second pending')

    def test_status_and_ordering_combine(self):
        response = self.client.get(
            self.url, {'status': RequestStatus.PENDING, 'ordering': 'created_at'}
        )

        self.assertEqual(self._titles(response), ['Oldest pending', 'Second pending'])

    def test_search_still_works_alongside_the_status_filter(self):
        """The reports view searches this same endpoint; filtering must not break it."""
        response = self.client.get(self.url, {'search': 'Oldest'})

        self.assertEqual(self._titles(response), ['Oldest pending'])

    def test_residents_still_cannot_read_the_manager_list(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url, {'status': RequestStatus.PENDING})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
