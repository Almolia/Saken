from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from billing.services import SettlementError, process_request_settlement
from buildings.models import Building, Unit
from maintenance.models import PaymentMethod, RequestStatus, ServiceRequest

User = get_user_model()


def make_resident(suffix, national_suffix):
    return User.objects.create_user(
        phone=f'0912000{suffix}', password='Resident123',
        full_name=f'ساکن {suffix}', national_id=f'12345{national_suffix}',
        role='resident',
    )


class SettlementServiceTests(TestCase):
    def setUp(self):
        self.building = Building.objects.create(name='برج ساکن', building_wallet_balance=Decimal('1000.00'))
        self.requester = make_resident('0101', '00101')
        self.neighbour = make_resident('0102', '00102')

        self.requester_unit = Unit.objects.create(
            owner=self.requester, building=self.building,
            unit_number='101', floor=1, area='80.00',
        )
        self.neighbour_unit = Unit.objects.create(
            owner=self.neighbour, building=self.building,
            unit_number='102', floor=1, area='80.00',
        )

        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.requester, status=RequestStatus.COMPLETED,
            work_report='انجام شد.',
        )

    def settle(self, cost, method):
        return process_request_settlement(self.service_request.pk, cost, method)

    def refresh(self):
        self.requester_unit.refresh_from_db()
        self.neighbour_unit.refresh_from_db()
        self.building.refresh_from_db()
        self.service_request.refresh_from_db()

    # --- EQUAL_SPLIT ---------------------------------------------------

    def test_equal_split_divides_the_cost_across_every_unit(self):
        self.settle('300.00', PaymentMethod.EQUAL_SPLIT)
        self.refresh()

        self.assertEqual(self.requester_unit.debt, Decimal('150.00'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('150.00'))

    def test_equal_split_leftover_cents_keep_the_total_exact(self):
        self.settle('100.01', PaymentMethod.EQUAL_SPLIT)
        self.refresh()

        total = self.requester_unit.debt + self.neighbour_unit.debt
        self.assertEqual(total, Decimal('100.01'))
        self.assertEqual(self.requester_unit.debt, Decimal('50.01'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('50.00'))

    def test_equal_split_never_loses_or_invents_money(self):
        """Across awkward unit counts the debt created must still total the cost.

        A naive round-half divide leaks cents: 100.00 over 3 units as 33.33 each
        only accounts for 99.99.
        """
        cases = [
            (3, '100.00'),
            (7, '100.00'),
            (6, '0.05'),
            (3, '1000000.00'),
            (11, '99.99'),
        ]

        for unit_count, cost in cases:
            with self.subTest(units=unit_count, cost=cost):
                Unit.objects.all().delete()
                for index in range(unit_count):
                    Unit.objects.create(
                        building=self.building, unit_number=f'{index:03d}',
                        floor=1, area='70.00',
                    )
                self.service_request.is_settled = False
                self.service_request.cost = None
                self.service_request.payment_method = None
                self.service_request.save()

                self.settle(cost, PaymentMethod.EQUAL_SPLIT)

                charged = sum(Unit.objects.values_list('debt', flat=True))
                self.assertEqual(charged, Decimal(cost))

                # The spread stays within a cent, so nobody is unfairly loaded.
                debts = sorted(Unit.objects.values_list('debt', flat=True))
                self.assertLessEqual(debts[-1] - debts[0], Decimal('0.01'))

    def test_equal_split_adds_to_existing_debt(self):
        Unit.objects.update(debt=Decimal('25.00'))

        self.settle('100.00', PaymentMethod.EQUAL_SPLIT)
        self.refresh()

        self.assertEqual(self.requester_unit.debt, Decimal('75.00'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('75.00'))

    def test_equal_split_leaves_the_building_wallet_untouched(self):
        self.settle('300.00', PaymentMethod.EQUAL_SPLIT)
        self.refresh()

        self.assertEqual(self.building.building_wallet_balance, Decimal('1000.00'))

    def test_equal_split_without_any_units_is_rejected(self):
        Unit.objects.all().delete()

        with self.assertRaises(SettlementError):
            self.settle('100.00', PaymentMethod.EQUAL_SPLIT)

    # --- REQUESTER_ONLY ------------------------------------------------

    def test_requester_only_charges_just_the_requesting_unit(self):
        self.settle('250.00', PaymentMethod.REQUESTER_ONLY)
        self.refresh()

        self.assertEqual(self.requester_unit.debt, Decimal('250.00'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('0.00'))
        self.assertEqual(self.building.building_wallet_balance, Decimal('1000.00'))

    def test_requester_without_a_unit_is_rejected(self):
        self.requester_unit.delete()

        with self.assertRaises(SettlementError):
            self.settle('250.00', PaymentMethod.REQUESTER_ONLY)

    # --- BUILDING_WALLET -----------------------------------------------

    def test_building_wallet_deducts_from_the_shared_fund(self):
        self.settle('400.00', PaymentMethod.BUILDING_WALLET)
        self.refresh()

        self.assertEqual(self.building.building_wallet_balance, Decimal('600.00'))
        self.assertEqual(self.requester_unit.debt, Decimal('0.00'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('0.00'))

    def test_building_wallet_may_be_drained_exactly_to_zero(self):
        self.settle('1000.00', PaymentMethod.BUILDING_WALLET)
        self.refresh()

        self.assertEqual(self.building.building_wallet_balance, Decimal('0.00'))

    def test_building_wallet_rejects_insufficient_funds(self):
        with self.assertRaises(SettlementError):
            self.settle('1000.01', PaymentMethod.BUILDING_WALLET)

    def test_a_failed_wallet_settlement_rolls_everything_back(self):
        with self.assertRaises(SettlementError):
            self.settle('5000.00', PaymentMethod.BUILDING_WALLET)
        self.refresh()

        self.assertEqual(self.building.building_wallet_balance, Decimal('1000.00'))
        self.assertFalse(self.service_request.is_settled)
        self.assertIsNone(self.service_request.cost)
        self.assertIsNone(self.service_request.payment_method)

    # --- guards --------------------------------------------------------

    def test_settling_records_cost_method_and_flag(self):
        self.settle('300.00', PaymentMethod.EQUAL_SPLIT)
        self.refresh()

        self.assertTrue(self.service_request.is_settled)
        self.assertEqual(self.service_request.cost, Decimal('300.00'))
        self.assertEqual(self.service_request.payment_method, PaymentMethod.EQUAL_SPLIT)

    def test_a_request_cannot_be_settled_twice(self):
        self.settle('300.00', PaymentMethod.EQUAL_SPLIT)

        with self.assertRaises(SettlementError):
            self.settle('300.00', PaymentMethod.EQUAL_SPLIT)

        self.refresh()
        self.assertEqual(self.requester_unit.debt, Decimal('150.00'))

    def test_an_unfinished_request_cannot_be_settled(self):
        self.service_request.status = RequestStatus.ASSIGNED
        self.service_request.save(update_fields=['status'])

        with self.assertRaises(SettlementError):
            self.settle('300.00', PaymentMethod.EQUAL_SPLIT)

    def test_non_positive_costs_are_rejected(self):
        for bad_cost in ['0', '0.00', '-50.00']:
            with self.subTest(cost=bad_cost):
                with self.assertRaises(SettlementError):
                    self.settle(bad_cost, PaymentMethod.EQUAL_SPLIT)

    def test_an_unknown_payment_method_is_rejected(self):
        with self.assertRaises(SettlementError):
            self.settle('300.00', 'CRYPTO')

    def test_a_missing_request_is_rejected(self):
        with self.assertRaises(SettlementError):
            process_request_settlement(999999, '300.00', PaymentMethod.EQUAL_SPLIT)

    def test_float_costs_are_accepted_and_stored_as_decimal(self):
        self.settle(300.5, PaymentMethod.REQUESTER_ONLY)
        self.refresh()

        self.assertEqual(self.requester_unit.debt, Decimal('300.50'))
        self.assertEqual(self.service_request.cost, Decimal('300.50'))
