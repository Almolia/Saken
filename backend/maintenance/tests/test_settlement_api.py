import threading
from decimal import Decimal

from billing.services import process_request_settlement
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from buildings.models import Building, Unit
from maintenance.models import PaymentMethod, RequestStatus, ServiceRequest

__all__ = [
    'SettlementEndpointTests',
    'EqualSplitScopeEndpointTests',
    'SettlementConcurrencyTests',
]

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
            owner=self.resident, unit_number='101', floor=1, area='80.00',
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


class EqualSplitScopeEndpointTests(APITestCase):
    """Equal Split through the API bills every registered unit.

    Units used to carry a `building` foreign key that the unit form never
    filled in, so those units were skipped by the split and the settlement
    could even be refused with "the building of this request is unknown".
    """

    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09120000211', password='Manager123',
            full_name='مدیر ساختمان', national_id='1234500211',
            role='manager', is_staff=True,
        )
        self.resident_a = User.objects.create_user(
            phone='09120000212', password='Resident123',
            full_name='سارا احمدی', national_id='1234500212',
            role='resident',
        )
        self.resident_b = User.objects.create_user(
            phone='09120000213', password='Resident123',
            full_name='رضا کریمی', national_id='1234500213',
            role='resident',
        )

        self.building = Building.objects.create(
            name='برج ساکن', building_wallet_balance=Decimal('500.00'),
        )
        self.unit_1 = Unit.objects.create(
            owner=self.resident_a, unit_number='101', floor=1, area='80.00',
        )
        self.unit_2 = Unit.objects.create(
            unit_number='102', floor=1, area='80.00',
        )
        self.unit_3 = Unit.objects.create(
            owner=self.resident_b, unit_number='201', floor=2, area='90.00',
        )
        self.unit_4 = Unit.objects.create(
            unit_number='202', floor=2, area='90.00',
        )

        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.resident_a,
            status=RequestStatus.COMPLETED, work_report='انجام شد.',
        )
        self.url = reverse('manager-service-request-settle', kwargs={'pk': self.service_request.pk})

    def test_equal_split_bills_all_four_units_and_spares_the_wallet(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            self.url,
            {'cost': '300.00', 'payment_method': PaymentMethod.EQUAL_SPLIT},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for unit in (self.unit_1, self.unit_2, self.unit_3, self.unit_4):
            unit.refresh_from_db()
            self.assertEqual(unit.debt, Decimal('75.00'))

        self.building.refresh_from_db()
        self.assertEqual(self.building.building_wallet_balance, Decimal('500.00'))


class SettlementConcurrencyTests(TransactionTestCase):
    """Two settle requests racing on the same service request must not both win.

    The validation lives inside one atomic transaction with the row locked, so
    whichever attempt commits first flips is_settled before the other one can
    pass the check — the cost may be routed exactly once, never twice.
    """

    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09120000221', password='Manager123',
            full_name='مدیر ساختمان', national_id='1234500221',
            role='manager', is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09120000222', password='Resident123',
            full_name='سارا احمدی', national_id='1234500222',
            role='resident',
        )

        self.building = Building.objects.create(
            name='برج ساکن', building_wallet_balance=Decimal('500.00'),
        )
        self.unit = Unit.objects.create(
            owner=self.resident, unit_number='101', floor=1, area='80.00',
        )
        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.resident,
            status=RequestStatus.COMPLETED, work_report='انجام شد.',
        )

    def test_only_one_concurrent_settlement_attempt_succeeds(self):
        from django.db import DatabaseError, connection

        from billing.services import SettlementError

        barrier = threading.Barrier(2)
        results = []

        def attempt():
            try:
                # Force both threads into the settlement transaction together.
                barrier.wait(timeout=10)
                process_request_settlement(
                    self.service_request.pk, '120.00', PaymentMethod.REQUESTER_ONLY,
                )
                results.append('settled')
            except SettlementError:
                results.append('rejected')
            except DatabaseError:
                # SQLite serialises writers at the database level; a loser may
                # surface the lock as an OperationalError. Either way it must
                # not have settled.
                results.append('rejected')
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        for thread in threads:
            self.assertFalse(thread.is_alive())

        self.assertEqual(len(results), 2)
        self.assertEqual(results.count('settled'), 1)
        self.assertEqual(results.count('rejected'), 1)

        self.service_request.refresh_from_db()
        self.assertTrue(self.service_request.is_settled)
        self.assertEqual(self.service_request.cost, Decimal('120.00'))

        # The cost was routed exactly once.
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.debt, Decimal('120.00'))
