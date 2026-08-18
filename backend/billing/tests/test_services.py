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
            owner=self.requester, unit_number='101', floor=1, area='80.00',
        )
        self.neighbour_unit = Unit.objects.create(
            owner=self.neighbour, unit_number='102', floor=1, area='80.00',
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
                    # The requester must own a unit in the building: the split
                    # is scoped to the requester's building, resolved through
                    # their own unit.
                    Unit.objects.create(
                        owner=self.requester, unit_number=f'{index:03d}',
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


class SingleBuildingSettlementScopeTests(TestCase):
    """Settlement covers every unit of the one building this app manages.

    The schema used to carry a `building` foreign key on Unit, and every
    unit-scoped routing rule filtered on it. Units created without one — which
    the manager UI never filled in — were skipped by Equal Split and made
    settlement fail outright with "the building of this request is unknown".
    With the column gone, the whole Unit table is the building.
    """

    def setUp(self):
        self.building = Building.objects.create(
            name='برج ساکن', building_wallet_balance=Decimal('1000.00'),
        )

        self.requester = make_resident('0201', '00201')
        self.neighbour = make_resident('0202', '00202')

        self.unit_1 = Unit.objects.create(
            owner=self.requester, unit_number='101', floor=1, area='80.00',
        )
        self.unit_2 = Unit.objects.create(
            unit_number='102', floor=1, area='80.00',
        )
        self.unit_3 = Unit.objects.create(
            owner=self.neighbour, unit_number='201', floor=2, area='90.00',
        )
        self.unit_4 = Unit.objects.create(
            unit_number='202', floor=2, area='90.00',
        )
        self.units = (self.unit_1, self.unit_2, self.unit_3, self.unit_4)

        self.service_request = ServiceRequest.objects.create(
            title='نشتی آب', description='چکه می‌کند.',
            resident=self.requester, status=RequestStatus.COMPLETED,
            work_report='انجام شد.',
        )

    def settle(self, cost, method):
        return process_request_settlement(self.service_request.pk, cost, method)

    def refresh(self):
        for unit in self.units:
            unit.refresh_from_db()
        self.building.refresh_from_db()

    def test_equal_split_reaches_every_registered_unit(self):
        self.settle('300.00', PaymentMethod.EQUAL_SPLIT)
        self.refresh()

        for unit in self.units:
            self.assertEqual(unit.debt, Decimal('75.00'))

        # Splitting across units never touches the shared fund.
        self.assertEqual(self.building.building_wallet_balance, Decimal('1000.00'))

    def test_equal_split_works_without_any_building_record(self):
        """No registered building must not block a unit-billed settlement.

        Equal Split moves money between units only, so it may never depend on
        the manager having filled in the building settings form.
        """
        Building.objects.all().delete()

        self.settle('300.00', PaymentMethod.EQUAL_SPLIT)

        for unit in self.units:
            unit.refresh_from_db()
            self.assertEqual(unit.debt, Decimal('75.00'))

        # A unit-billed settlement moves no money into the shared fund, so it
        # must not have created the building record either.
        self.assertFalse(Building.objects.exists())

    def test_requester_only_charges_only_the_requesting_unit(self):
        self.settle('250.00', PaymentMethod.REQUESTER_ONLY)
        self.refresh()

        self.assertEqual(self.unit_1.debt, Decimal('250.00'))
        for unit in (self.unit_2, self.unit_3, self.unit_4):
            self.assertEqual(unit.debt, Decimal('0.00'))

    def test_wallet_settlement_moves_the_shared_fund_only(self):
        self.settle('400.00', PaymentMethod.BUILDING_WALLET)
        self.refresh()

        self.assertEqual(self.building.building_wallet_balance, Decimal('600.00'))
        for unit in self.units:
            self.assertEqual(unit.debt, Decimal('0.00'))

    def test_wallet_settlement_registers_the_building_when_missing(self):
        """The wallet is the one building's fund, so it is created on demand.

        A wallet settlement against an unregistered building has no funds, so
        it is refused for lack of balance — never with an "unknown building"
        error — and nothing moves.
        """
        Building.objects.all().delete()

        with self.assertRaises(SettlementError) as caught:
            self.settle('400.00', PaymentMethod.BUILDING_WALLET)

        self.assertEqual(
            str(caught.exception),
            'موجودی صندوق ساختمان برای پرداخت این هزینه کافی نیست.',
        )
        self.service_request.refresh_from_db()
        self.assertFalse(self.service_request.is_settled)


class SettlementLedgerTests(TestCase):
    """A settled cost must be backed by charge rows so it can actually be paid.

    Before the fix the settlement path only bumped Unit.debt, leaving no
    UnitCharge behind — ResidentPendingChargesView and process_resident_payment
    work off UnitCharge rows, so that debt could never be displayed or paid.
    """

    def setUp(self):
        self.building = Building.objects.create(
            name='برج ساکن', building_wallet_balance=Decimal('1000.00'),
        )
        self.manager = User.objects.create_user(
            phone='09120000399', password='Manager123',
            full_name='مدیر ساختمان', national_id='1234500399',
            role='manager', is_staff=True,
        )
        self.requester = make_resident('0301', '00301')
        self.neighbour = make_resident('0302', '00302')

        self.requester_unit = Unit.objects.create(
            owner=self.requester, unit_number='101', floor=1, area='80.00',
        )
        self.neighbour_unit = Unit.objects.create(
            owner=self.neighbour, unit_number='102', floor=1, area='80.00',
        )

        self.service_request = ServiceRequest.objects.create(
            title='تعمیر آسانسور', description='موتور آسانسور تعویض شد.',
            resident=self.requester, status=RequestStatus.COMPLETED,
            work_report='انجام شد.',
        )

    def settle(self, cost, method):
        return process_request_settlement(
            self.service_request.pk, cost, method, settled_by=self.manager,
        )

    def test_equal_split_creates_pending_charge_rows_matching_the_debt(self):
        from billing.models import MasterCharge, UnitCharge, UnitChargeStatus
        from django.utils import timezone

        self.settle('100.01', PaymentMethod.EQUAL_SPLIT)

        master = MasterCharge.objects.get()
        self.assertEqual(master.title, self.service_request.title)
        self.assertEqual(master.description, self.service_request.description)
        self.assertTrue(master.apply_to_all)
        self.assertEqual(master.created_by, self.manager)
        # Settlement bills are payable right away.
        self.assertEqual(master.due_date, timezone.localdate())

        charges = list(UnitCharge.objects.filter(master_charge=master).order_by('unit__unit_number'))
        self.assertEqual(len(charges), 2)
        self.assertTrue(all(charge.status == UnitChargeStatus.PENDING for charge in charges))
        self.assertEqual(
            [charge.unit_id for charge in charges],
            [self.requester_unit.pk, self.neighbour_unit.pk],
        )

        # Rounding remainder keeps the total exact, and debt mirrors the rows.
        self.assertEqual(
            sum(charge.amount for charge in charges), Decimal('100.01'),
        )
        self.requester_unit.refresh_from_db()
        self.neighbour_unit.refresh_from_db()
        self.assertEqual(self.requester_unit.debt, Decimal('50.01'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('50.00'))

        # The ledger invariant holds unit by unit.
        for unit in (self.requester_unit, self.neighbour_unit):
            pending_total = sum(
                UnitCharge.objects.filter(
                    unit=unit, status=UnitChargeStatus.PENDING,
                ).values_list('amount', flat=True), Decimal('0.00'),
            )
            self.assertEqual(unit.debt, pending_total)

    def test_requester_only_creates_a_single_charge_row(self):
        from billing.models import MasterCharge, UnitCharge, UnitChargeStatus

        self.settle('250.00', PaymentMethod.REQUESTER_ONLY)

        master = MasterCharge.objects.get()
        self.assertFalse(master.apply_to_all)
        self.assertEqual(master.amount_per_unit, Decimal('250.00'))
        self.assertEqual(master.created_by, self.manager)

        charge = UnitCharge.objects.get()
        self.assertEqual(charge.master_charge, master)
        self.assertEqual(charge.unit, self.requester_unit)
        self.assertEqual(charge.amount, Decimal('250.00'))
        self.assertEqual(charge.status, UnitChargeStatus.PENDING)

        self.requester_unit.refresh_from_db()
        self.assertEqual(self.requester_unit.debt, Decimal('250.00'))

    def test_building_wallet_creates_no_charge_rows(self):
        from billing.models import MasterCharge, UnitCharge

        self.settle('400.00', PaymentMethod.BUILDING_WALLET)

        self.assertEqual(MasterCharge.objects.count(), 0)
        self.assertEqual(UnitCharge.objects.count(), 0)
        self.requester_unit.refresh_from_db()
        self.neighbour_unit.refresh_from_db()
        self.assertEqual(self.requester_unit.debt, Decimal('0.00'))
        self.assertEqual(self.neighbour_unit.debt, Decimal('0.00'))

    def test_a_refused_settlement_creates_no_charge_rows(self):
        from billing.models import MasterCharge, UnitCharge

        with self.assertRaises(SettlementError):
            self.settle('5000.00', PaymentMethod.BUILDING_WALLET)

        self.assertEqual(MasterCharge.objects.count(), 0)
        self.assertEqual(UnitCharge.objects.count(), 0)


class ReconcileUnitDebtsCommandTests(TestCase):
    """The reconcile command repairs pre-fix debt drift without touching clean units."""

    def setUp(self):
        self.building = Building.objects.create(name='برج ساکن')
        self.owner = make_resident('0401', '00401')
        self.drifted_unit = Unit.objects.create(
            owner=self.owner, unit_number='101', floor=1, area='80.00',
            debt=Decimal('75.00'),  # includes a pre-fix settlement with no rows
        )
        self.clean_unit = Unit.objects.create(
            unit_number='102', floor=1, area='80.00',
            debt=Decimal('0.00'),
        )

    def test_preview_does_not_write(self):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command('reconcile_unit_debts', stdout=out)

        self.drifted_unit.refresh_from_db()
        self.assertEqual(self.drifted_unit.debt, Decimal('75.00'))
        self.assertIn('101', out.getvalue())

    def test_apply_realigns_debt_with_pending_rows(self):
        from io import StringIO

        from billing.models import MasterCharge, UnitCharge, UnitChargeStatus
        from django.core.management import call_command

        master = MasterCharge.objects.create(
            title='شارژ ماهانه', amount_per_unit=Decimal('30.00'),
            due_date='2026-09-01',
        )
        UnitCharge.objects.create(
            master_charge=master, unit=self.drifted_unit,
            amount=Decimal('30.00'), status=UnitChargeStatus.PENDING,
        )

        out = StringIO()
        call_command('reconcile_unit_debts', '--apply', stdout=out)

        self.drifted_unit.refresh_from_db()
        self.clean_unit.refresh_from_db()
        # Drifted unit snaps back to what its pending rows actually bill.
        self.assertEqual(self.drifted_unit.debt, Decimal('30.00'))
        self.assertEqual(self.clean_unit.debt, Decimal('0.00'))
