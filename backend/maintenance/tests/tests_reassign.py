from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from maintenance.models import RequestStatus, ServiceRequest

User = get_user_model()


class ReassignServiceRequestTests(APITestCase):
    """A manager may hand an open request to a different staff member."""

    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09120000021', password='Manager123',
            full_name='مدیر ساختمان', national_id='1234500021',
            role='manager', is_staff=True,
        )
        self.staff_a = User.objects.create_user(
            phone='09120000022', password='Service123',
            full_name='کارمند اول', national_id='1234500022',
            role='service_staff',
        )
        self.staff_b = User.objects.create_user(
            phone='09120000023', password='Service123',
            full_name='کارمند دوم', national_id='1234500023',
            role='service_staff',
        )
        self.resident = User.objects.create_user(
            phone='09120000024', password='Resident123',
            full_name='سارا احمدی', national_id='1234500024',
            role='resident',
        )
        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.resident,
        )

    def assign_url(self, service_request):
        return reverse('manager-service-request-assign', kwargs={'pk': service_request.pk})

    def assign_to(self, staff):
        return self.client.patch(
            self.assign_url(self.service_request),
            {'staff_id': staff.pk},
            format='json',
        )

    def test_assigning_a_pending_request_reports_it_as_assigned(self):
        self.client.force_authenticate(user=self.manager)

        response = self.assign_to(self.staff_a)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'درخواست خدمات با موفقیت ارجاع شد.')
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.assigned_staff, self.staff_a)
        self.assertEqual(self.service_request.status, RequestStatus.ASSIGNED)

    def test_an_assigned_request_can_be_handed_to_another_staff_member(self):
        self.client.force_authenticate(user=self.manager)
        self.assign_to(self.staff_a)

        response = self.assign_to(self.staff_b)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'مسئول درخواست با موفقیت تغییر کرد.')
        self.assertEqual(response.data['request']['assigned_staff']['full_name'], 'کارمند دوم')
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.assigned_staff, self.staff_b)
        self.assertEqual(self.service_request.status, RequestStatus.ASSIGNED)

    def test_reassigning_moves_the_task_off_the_previous_staff_list(self):
        self.client.force_authenticate(user=self.manager)
        self.assign_to(self.staff_a)
        self.assign_to(self.staff_b)

        self.client.force_authenticate(user=self.staff_a)
        old_owner_tasks = self.client.get(reverse('staff-request-list'))
        self.client.force_authenticate(user=self.staff_b)
        new_owner_tasks = self.client.get(reverse('staff-request-list'))

        self.assertEqual(len(old_owner_tasks.data), 0)
        self.assertEqual(len(new_owner_tasks.data), 1)
        self.assertEqual(new_owner_tasks.data[0]['title'], 'نشتی آب')

    def test_completed_requests_cannot_be_reassigned(self):
        self.service_request.assigned_staff = self.staff_a
        self.service_request.status = RequestStatus.COMPLETED
        self.service_request.work_report = 'انجام شد.'
        self.service_request.save()
        self.client.force_authenticate(user=self.manager)

        response = self.assign_to(self.staff_b)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'درخواست‌های تکمیل‌شده قابل ارجاع مجدد نیستند.')
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.assigned_staff, self.staff_a)

    def test_reassigning_to_a_non_staff_user_is_rejected(self):
        self.client.force_authenticate(user=self.manager)
        self.assign_to(self.staff_a)

        response = self.assign_to(self.resident)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.assigned_staff, self.staff_a)

    def test_staff_cannot_reassign_their_own_task(self):
        self.client.force_authenticate(user=self.manager)
        self.assign_to(self.staff_a)

        self.client.force_authenticate(user=self.staff_a)
        response = self.assign_to(self.staff_b)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.assigned_staff, self.staff_a)
