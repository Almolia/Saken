from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from maintenance.models import ServiceRequest

User = get_user_model()


class StaffRequestPayloadTests(APITestCase):
    """The staff task list has to carry enough detail for staff to act on a job."""

    def setUp(self):
        self.staff = User.objects.create_user(
            phone='33333333331', password='passwordA',
            full_name='Staff A', national_id='3333333331',
            role='service_staff',
        )
        self.resident = User.objects.create_user(
            phone='55555555551', password='passwordRes',
            full_name='سارا احمدی', national_id='5555555551',
            role='resident',
        )
        self.building = Building.objects.create(name='برج اول')
        self.unit = Unit.objects.create(
            owner=self.resident, building=self.building,
            unit_number='102', floor=1, area='85.00',
        )
        self.service_request = ServiceRequest.objects.create(
            title='Fix Sink', description='Leaking',
            resident=self.resident, assigned_staff=self.staff,
        )
        self.list_url = reverse('staff-request-list')

    def test_task_list_exposes_resident_and_unit_number(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task = response.data[0]
        self.assertEqual(task['title'], 'Fix Sink')
        self.assertEqual(task['description'], 'Leaking')
        self.assertEqual(task['status'], 'Pending')
        self.assertEqual(task['unit_number'], '102')
        self.assertEqual(task['resident']['full_name'], 'سارا احمدی')
        self.assertEqual(task['resident']['phone'], '55555555551')

    def test_unit_number_is_null_when_resident_has_no_unit(self):
        self.unit.delete()
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data[0]['unit_number'])

    def test_lowest_unit_number_is_reported_for_multi_unit_residents(self):
        Unit.objects.create(
            owner=self.resident, building=self.building,
            unit_number='101', floor=1, area='70.00',
        )
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.data[0]['unit_number'], '101')

    def test_work_report_patch_still_returns_the_enriched_payload(self):
        self.client.force_authenticate(user=self.staff)
        detail_url = reverse('staff-request-detail', kwargs={'pk': self.service_request.pk})

        response = self.client.patch(detail_url, data={'work_report': 'شیر آب تعویض شد.'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Completed')
        self.assertEqual(response.data['work_report'], 'شیر آب تعویض شد.')
        self.assertEqual(response.data['unit_number'], '102')
        self.assertEqual(response.data['resident']['full_name'], 'سارا احمدی')

    def test_resident_details_stay_read_only(self):
        self.client.force_authenticate(user=self.staff)
        detail_url = reverse('staff-request-detail', kwargs={'pk': self.service_request.pk})

        response = self.client.patch(
            detail_url,
            data={'work_report': 'انجام شد.', 'title': 'hacked', 'resident': 999},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service_request.refresh_from_db()
        self.assertEqual(self.service_request.title, 'Fix Sink')
        self.assertEqual(self.service_request.resident, self.resident)
