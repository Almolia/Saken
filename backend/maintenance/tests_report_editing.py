from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from maintenance.models import RequestStatus, ServiceRequest

User = get_user_model()


class WorkReportEditingTests(APITestCase):
    """Staff may correct or withdraw a report they already filed."""

    def setUp(self):
        self.staff = User.objects.create_user(
            phone='09120000041', password='Service123',
            full_name='کارمند خدمات', national_id='1234500041',
            role='service_staff',
        )
        self.other_staff = User.objects.create_user(
            phone='09120000042', password='Service123',
            full_name='کارمند دیگر', national_id='1234500042',
            role='service_staff',
        )
        self.resident = User.objects.create_user(
            phone='09120000043', password='Resident123',
            full_name='سارا احمدی', national_id='1234500043',
            role='resident',
        )
        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.resident, assigned_staff=self.staff,
            status=RequestStatus.COMPLETED, work_report='گزارش اولیه',
        )
        self.detail_url = reverse('staff-request-detail', kwargs={'pk': self.service_request.pk})

    def patch_report(self, value):
        return self.client.patch(self.detail_url, {'work_report': value}, format='json')

    def test_staff_can_rewrite_an_existing_report(self):
        self.client.force_authenticate(user=self.staff)

        response = self.patch_report('گزارش اصلاح‌شده')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.work_report, 'گزارش اصلاح‌شده')
        self.assertEqual(self.service_request.status, RequestStatus.COMPLETED)

    def test_report_is_stored_trimmed(self):
        self.client.force_authenticate(user=self.staff)

        self.patch_report('   گزارش با فاصله   ')

        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.work_report, 'گزارش با فاصله')

    def test_clearing_the_report_reopens_the_request(self):
        self.client.force_authenticate(user=self.staff)

        response = self.patch_report('')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], RequestStatus.ASSIGNED)
        self.service_request.refresh_from_db()
        self.assertIsNone(self.service_request.work_report)
        self.assertEqual(self.service_request.status, RequestStatus.ASSIGNED)

    def test_a_whitespace_only_report_counts_as_clearing(self):
        self.client.force_authenticate(user=self.staff)

        self.patch_report('    ')

        self.service_request.refresh_from_db()
        self.assertIsNone(self.service_request.work_report)
        self.assertEqual(self.service_request.status, RequestStatus.ASSIGNED)

    def test_a_null_report_also_reopens_the_request(self):
        self.client.force_authenticate(user=self.staff)

        self.patch_report(None)

        self.service_request.refresh_from_db()
        self.assertIsNone(self.service_request.work_report)
        self.assertEqual(self.service_request.status, RequestStatus.ASSIGNED)

    def test_a_reopened_request_can_be_completed_again(self):
        self.client.force_authenticate(user=self.staff)
        self.patch_report('')

        self.patch_report('گزارش نهایی')

        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.work_report, 'گزارش نهایی')
        self.assertEqual(self.service_request.status, RequestStatus.COMPLETED)

    def test_staff_cannot_touch_a_report_on_someone_elses_request(self):
        self.client.force_authenticate(user=self.other_staff)

        response = self.patch_report('دستکاری')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.work_report, 'گزارش اولیه')

    def test_a_reopened_request_returns_to_the_staff_open_list(self):
        self.client.force_authenticate(user=self.staff)
        self.patch_report('')

        response = self.client.get(reverse('staff-request-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['status'], RequestStatus.ASSIGNED)
        self.assertIsNone(response.data[0]['work_report'])
