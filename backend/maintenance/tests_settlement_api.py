from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from maintenance.models import PaymentMethod, RequestStatus, ServiceRequest

__all__ = ['SettlementEndpointTests']

User = get_user_model()


class SettlementEndpointTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09120000201', password='Manager123',
            full_name='مدیر ساختمان', national_id='1234500201',
            role='manager', is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09120000202', password='Resident123',
            full_name='سارا احمدی', national_id='1234500202',
            role='resident',
        )
        self.staff = User.objects.create_user(
            phone='09120000203', password='Service123',
            full_name='کارمند خدمات', national_id='1234500203',
            role='service_staff',
        )

        self.building = Building.objects.create(
            name='برج ساکن', building_wallet_balance=Decimal('500.00'),
        )
        self.unit = Unit.objects.create(
            owner=self.resident, building=self.building,
            unit_number='101', floor=1, area='80.00',
        )
        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.resident, assigned_staff=self.staff,
            status=RequestStatus.COMPLETED, work_report='انجام شد.',
        )
        self.url = reverse('manager-service-request-settle', kwargs={'pk': self.service_request.pk})

    def settle(self, **payload):
        return self.client.post(self.url, payload, format='json')

    def test_manager_can_settle_a_completed_request(self):
        self.client.force_authenticate(user=self.manager)

        response = self.settle(cost='120.00', payment_method=PaymentMethod.REQUESTER_ONLY)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'تسویه هزینه با موفقیت انجام شد.')
        body = response.data['request']
        self.assertTrue(body['is_settled'])
        self.assertEqual(Decimal(body['cost']), Decimal('120.00'))
        self.assertEqual(body['payment_method'], PaymentMethod.REQUESTER_ONLY)

        self.unit.refresh_from_db()
        self.assertEqual(self.unit.debt, Decimal('120.00'))

    def test_building_wallet_settlement_moves_the_shared_fund(self):
        self.client.force_authenticate(user=self.manager)

        response = self.settle(cost='200.00', payment_method=PaymentMethod.BUILDING_WALLET)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.building.refresh_from_db()
        self.assertEqual(self.building.building_wallet_balance, Decimal('300.00'))

    def test_insufficient_wallet_funds_are_reported(self):
        self.client.force_authenticate(user=self.manager)

        response = self.settle(cost='900.00', payment_method=PaymentMethod.BUILDING_WALLET)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'موجودی صندوق ساختمان برای پرداخت این هزینه کافی نیست.')
        self.building.refresh_from_db()
        self.assertEqual(self.building.building_wallet_balance, Decimal('500.00'))
        self.service_request.refresh_from_db()
        self.assertFalse(self.service_request.is_settled)

    def test_an_unfinished_request_cannot_be_settled(self):
        """Only Completed work may be settled; Pending and Assigned are refused."""
        self.client.force_authenticate(user=self.manager)

        for unfinished_status in (RequestStatus.PENDING, RequestStatus.ASSIGNED):
            with self.subTest(status=unfinished_status):
                self.service_request.status = unfinished_status
                self.service_request.is_settled = False
                self.service_request.save(update_fields=['status', 'is_settled'])
                Unit.objects.update(debt=Decimal('0.00'))

                response = self.settle(cost='120.00', payment_method=PaymentMethod.EQUAL_SPLIT)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(
                    response.data['detail'],
                    'فقط درخواست‌های تکمیل‌شده قابل تسویه هستند.',
                )

                # Nothing may have moved on a refused settlement.
                self.service_request.refresh_from_db()
                self.assertFalse(self.service_request.is_settled)
                self.assertIsNone(self.service_request.cost)
                self.unit.refresh_from_db()
                self.assertEqual(self.unit.debt, Decimal('0.00'))
                self.building.refresh_from_db()
                self.assertEqual(self.building.building_wallet_balance, Decimal('500.00'))

    def test_a_request_cannot_be_settled_twice(self):
        self.client.force_authenticate(user=self.manager)
        self.settle(cost='120.00', payment_method=PaymentMethod.REQUESTER_ONLY)

        response = self.settle(cost='120.00', payment_method=PaymentMethod.REQUESTER_ONLY)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'هزینه این درخواست قبلاً تسویه شده است.')
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.debt, Decimal('120.00'))

    def test_non_positive_costs_are_rejected(self):
        self.client.force_authenticate(user=self.manager)

        for bad_cost in ['0.00', '-10.00']:
            with self.subTest(cost=bad_cost):
                response = self.settle(cost=bad_cost, payment_method=PaymentMethod.EQUAL_SPLIT)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('cost', response.data)

    def test_an_unknown_payment_method_is_rejected(self):
        self.client.force_authenticate(user=self.manager)

        response = self.settle(cost='120.00', payment_method='CRYPTO')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('payment_method', response.data)

    def test_a_missing_payload_is_rejected(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(self.url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cost', response.data)
        self.assertIn('payment_method', response.data)

    def test_settling_a_missing_request_returns_404(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse('manager-service-request-settle', kwargs={'pk': 999999})

        response = self.client.post(url, {'cost': '10.00', 'payment_method': PaymentMethod.EQUAL_SPLIT}, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_residents_cannot_settle(self):
        self.client.force_authenticate(user=self.resident)

        response = self.settle(cost='120.00', payment_method=PaymentMethod.REQUESTER_ONLY)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.debt, Decimal('0.00'))

    def test_service_staff_cannot_settle(self):
        self.client.force_authenticate(user=self.staff)

        response = self.settle(cost='120.00', payment_method=PaymentMethod.REQUESTER_ONLY)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_users_cannot_settle(self):
        response = self.settle(cost='120.00', payment_method=PaymentMethod.REQUESTER_ONLY)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_the_endpoint_rejects_methods_other_than_post(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
