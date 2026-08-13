from decimal import Decimal

from buildings.models import Building, Unit
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import UserRole

from .models import MasterCharge, UnitCharge, UnitChargeStatus

User = get_user_model()


class BaseChargeTestCase(APITestCase):
    def setUp(self):
        self.building = Building.objects.create(
            name="Saken Tower A",
            building_wallet_balance=Decimal("1000.00"),
        )

        self.manager = User.objects.create_user(
            phone="09120000001",
            password="ManagerPassword1",
            full_name="مدیر ساختمان",
            national_id="0000000001",
            role=UserRole.MANAGER,
        )

        self.resident = User.objects.create_user(
            phone="09120000002",
            password="ResidentPassword1",
            full_name="ساکن اول",
            national_id="0000000002",
            role=UserRole.RESIDENT,
        )

        self.other_resident = User.objects.create_user(
            phone="09120000003",
            password="ResidentPassword2",
            full_name="ساکن دوم",
            national_id="0000000003",
            role=UserRole.RESIDENT,
        )

        self.service_staff = User.objects.create_user(
            phone="09120000004",
            password="StaffPassword1",
            full_name="کارمند خدمات",
            national_id="0000000004",
            role=UserRole.SERVICE_STAFF,
        )

        self.unit1 = Unit.objects.create(
            owner=self.resident,
            building=self.building,
            unit_number="101",
            floor=1,
            area=80.00,
            debt=Decimal("500000.00"),
        )

        self.unit2 = Unit.objects.create(
            owner=self.other_resident,
            building=self.building,
            unit_number="102",
            floor=1,
            area=90.00,
            debt=Decimal("300000.00"),
        )

        self.unit3 = Unit.objects.create(
            building=self.building,
            unit_number="201",
            floor=2,
            area=100.00,
            debt=Decimal("0.00"),
        )


class FinancialIsolationAndAutomationTests(BaseChargeTestCase):
    def setUp(self):
        super().setUp()

        self.unit1.debt = Decimal("0.00")
        self.unit1.save(update_fields=["debt"])

        self.unit2.debt = Decimal("50000.00")
        self.unit2.save(update_fields=["debt"])

        self.url = reverse("manager-charges")

    def test_manager_issues_charge_to_all_units(self):
        """Simulate a manager issuing a charge to ALL units.

        Asserts:
        - A MasterCharge is created.
        - UnitCharge records equal the number of total units (3) with status Pending.
        - All unit_debt (Unit.debt) balances increase correctly.
        """
        self.client.force_authenticate(user=self.manager)
        payload = {
            "title": "شارژ عمومی شهریور ۱۴۰۵",
            "description": "نظافت و نگهداری مشاعات",
            "amount": "500000.00",
            "due_date": "2026-09-20",
            "apply_to_all": True,
        }

        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(MasterCharge.objects.count(), 1)
        master_charge = MasterCharge.objects.first()
        self.assertEqual(master_charge.title, "شارژ عمومی شهریور ۱۴۰۵")
        self.assertEqual(
            master_charge.amount_per_unit,
            Decimal("500000.00"),
        )
        self.assertEqual(master_charge.created_by, self.manager)
        self.assertTrue(master_charge.apply_to_all)

        total_units_count = Unit.objects.count()
        self.assertEqual(total_units_count, 3)

        unit_charges = UnitCharge.objects.filter(
            master_charge=master_charge
        )
        self.assertEqual(unit_charges.count(), total_units_count)

        for uc in unit_charges:
            self.assertEqual(uc.status, UnitChargeStatus.PENDING)
            self.assertEqual(uc.amount, Decimal("500000.00"))

        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()
        self.unit3.refresh_from_db()

        self.assertEqual(self.unit1.debt, Decimal("500000.00"))
        self.assertEqual(self.unit2.debt, Decimal("550000.00"))
        self.assertEqual(self.unit3.debt, Decimal("500000.00"))

    def test_manager_issues_charge_to_specific_units(self):
        """Simulate a manager issuing a charge to Specific Units.

        Asserts:
        - Only targeted units get a UnitCharge and debt increase.
        - Non-targeted units remain untouched.
        """
        self.client.force_authenticate(user=self.manager)

        payload = {
            "title": "شارژ تعمیر آسانسور",
            "description": "تعمیر موتور آسانسور",
            "amount": "200000.00",
            "due_date": "2026-09-25",
            "apply_to_all": False,
            "unit_ids": [self.unit1.id, self.unit3.id],
        }

        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        master_charge = MasterCharge.objects.first()
        self.assertFalse(master_charge.apply_to_all)

        self.assertEqual(
            UnitCharge.objects.filter(
                master_charge=master_charge
            ).count(),
            2,
        )

        targeted_pks = set(
            UnitCharge.objects.filter(
                master_charge=master_charge
            ).values_list("unit_id", flat=True)
        )
        self.assertEqual(targeted_pks, {self.unit1.id, self.unit3.id})

        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()
        self.unit3.refresh_from_db()

        self.assertEqual(self.unit1.debt, Decimal("200000.00"))
        self.assertEqual(self.unit2.debt, Decimal("50000.00"))
        self.assertEqual(self.unit3.debt, Decimal("200000.00"))

    def test_resident_cannot_create_charge(self):
        """Security test: Resident receives 403 Forbidden on POST to /api/manager/charges/."""
        self.client.force_authenticate(user=self.resident)

        payload = {
            "title": "شارژ غیرمجاز",
            "amount": "100000.00",
            "due_date": "2026-09-20",
            "apply_to_all": True,
        }

        response = self.client.post(self.url, data=payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(MasterCharge.objects.count(), 0)

    def test_service_staff_cannot_create_charge(self):
        """Security test: Service Staff receives 403 Forbidden on POST to /api/manager/charges/."""
        self.client.force_authenticate(user=self.service_staff)

        payload = {
            "title": "شارژ غیرمجاز کارمند",
            "amount": "100000.00",
            "due_date": "2026-09-20",
            "apply_to_all": True,
        }

        response = self.client.post(self.url, data=payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(MasterCharge.objects.count(), 0)

    def test_manager_get_master_list_sorted_newest_first_with_aggregated_data(self):
        """GET endpoint returns master list sorted newest first with aggregated unit count and amounts."""
        c1 = MasterCharge.objects.create(
            title="شارژ تیر",
            amount_per_unit=Decimal("400000.00"),
            due_date="2026-07-20",
            apply_to_all=True,
            created_by=self.manager,
        )

        UnitCharge.objects.create(
            master_charge=c1,
            unit=self.unit1,
            amount=Decimal("400000.00"),
        )
        UnitCharge.objects.create(
            master_charge=c1,
            unit=self.unit2,
            amount=Decimal("400000.00"),
        )
        UnitCharge.objects.create(
            master_charge=c1,
            unit=self.unit3,
            amount=Decimal("400000.00"),
        )

        c2 = MasterCharge.objects.create(
            title="شارژ مرداد",
            amount_per_unit=Decimal("450000.00"),
            due_date="2026-08-20",
            apply_to_all=False,
            created_by=self.manager,
        )

        UnitCharge.objects.create(
            master_charge=c2,
            unit=self.unit1,
            amount=Decimal("450000.00"),
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        charges = response.data["charges"]
        self.assertEqual(len(charges), 2)

        self.assertEqual(charges[0]["title"], "شارژ مرداد")
        self.assertEqual(charges[0]["units_count"], 1)
        self.assertEqual(charges[0]["total_amount"], "450000.00")

        self.assertEqual(charges[1]["title"], "شارژ تیر")
        self.assertEqual(charges[1]["units_count"], 3)
        self.assertEqual(charges[1]["total_amount"], "1200000.00")


class ResidentPendingChargesTests(BaseChargeTestCase):
    def setUp(self):
        super().setUp()

        self.unit1.debt = Decimal("500000.00")
        self.unit1.save(update_fields=["debt"])

        self.unit2.debt = Decimal("0.00")
        self.unit2.save(update_fields=["debt"])

        self.url = reverse("resident-pending-charges")

        self.pending_master = MasterCharge.objects.create(
            title="شارژ شهریور",
            description="نظافت مشاعات",
            amount_per_unit=Decimal("500000.00"),
            due_date="2026-09-20",
            apply_to_all=True,
            created_by=self.manager,
        )

        self.pending_charge = UnitCharge.objects.create(
            master_charge=self.pending_master,
            unit=self.unit1,
            amount=Decimal("500000.00"),
            status=UnitChargeStatus.PENDING,
        )

        self.paid_master = MasterCharge.objects.create(
            title="شارژ پرداخت‌شده",
            description="شارژ قدیمی",
            amount_per_unit=Decimal("100000.00"),
            due_date="2026-06-20",
            apply_to_all=True,
            created_by=self.manager,
        )

        UnitCharge.objects.create(
            master_charge=self.paid_master,
            unit=self.unit1,
            amount=Decimal("100000.00"),
            status=UnitChargeStatus.PAID,
        )

        UnitCharge.objects.create(
            master_charge=self.pending_master,
            unit=self.unit2,
            amount=Decimal("500000.00"),
            status=UnitChargeStatus.PENDING,
        )

    def test_resident_sees_only_own_pending_charges_with_master_data(self):
        """Resident gets their pending bill with title/description/due_date/amount."""
        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        charges = response.data["charges"]
        self.assertEqual(len(charges), 1)

        item = charges[0]
        self.assertEqual(item["title"], "شارژ شهریور")
        self.assertEqual(item["description"], "نظافت مشاعات")
        self.assertEqual(item["amount"], "500000.00")
        self.assertEqual(item["due_date"], "2026-09-20")
        self.assertEqual(item["status"], UnitChargeStatus.PENDING)

    def test_resident_does_not_see_paid_charges(self):
        """Paid bills are excluded from the pending list."""
        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)

        titles = [item["title"] for item in response.data["charges"]]
        self.assertNotIn("شارژ پرداخت‌شده", titles)

    def test_resident_does_not_see_other_residents_pending_charges(self):
        """Data isolation: Resident A must never receive Resident B's charges."""
        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        charges = response.data["charges"]
        self.assertEqual(len(charges), 1)

        leaked_units = set(
            UnitCharge.objects.filter(
                id__in=[c["id"] for c in charges]
            ).values_list("unit_id", flat=True)
        )

        self.assertNotIn(self.unit2.id, leaked_units)
        self.assertEqual(set(leaked_units), {self.unit1.id})

    def test_manager_cannot_access_resident_pending_endpoint(self):
        """Managers are rejected by the IsResident permission."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_request_is_rejected(self):
        """Anonymous requests are not allowed."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )


class ResidentPaymentTests(BaseChargeTestCase):
    def setUp(self):
        super().setUp()

        self.url = reverse("resident-pay-charges")

        self.master_charge1 = MasterCharge.objects.create(
            title="شارژ شهریور",
            description="نظافت مشاعات",
            amount_per_unit=Decimal("300000.00"),
            due_date="2026-09-20",
            apply_to_all=True,
            created_by=self.manager,
        )

        self.master_charge2 = MasterCharge.objects.create(
            title="شارژ تعمیر آسانسور",
            description="تعمیر موتور آسانسور",
            amount_per_unit=Decimal("200000.00"),
            due_date="2026-09-25",
            apply_to_all=True,
            created_by=self.manager,
        )

        self.resident_charge1 = UnitCharge.objects.create(
            master_charge=self.master_charge1,
            unit=self.unit1,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PENDING,
        )

        self.resident_charge2 = UnitCharge.objects.create(
            master_charge=self.master_charge2,
            unit=self.unit1,
            amount=Decimal("200000.00"),
            status=UnitChargeStatus.PENDING,
        )

        self.other_resident_charge = UnitCharge.objects.create(
            master_charge=self.master_charge1,
            unit=self.unit2,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PENDING,
        )

    def test_resident_can_pay_multiple_charges(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [
                    self.resident_charge1.id,
                    self.resident_charge2.id,
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.resident_charge1.refresh_from_db()
        self.resident_charge2.refresh_from_db()
        self.unit1.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(
            self.resident_charge1.status,
            UnitChargeStatus.PAID,
        )
        self.assertEqual(
            self.resident_charge2.status,
            UnitChargeStatus.PAID,
        )
        self.assertEqual(
            self.unit1.debt,
            Decimal("0.00"),
        )
        self.assertEqual(
            self.building.building_wallet_balance,
            Decimal("501000.00"),
        )

    def test_resident_cannot_pay_another_residents_charge(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [self.other_resident_charge.id],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.other_resident_charge.refresh_from_db()
        self.unit2.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(
            self.other_resident_charge.status,
            UnitChargeStatus.PENDING,
        )
        self.assertEqual(
            self.unit1.debt,
            Decimal("500000.00"),
        )
        self.assertEqual(
            self.unit2.debt,
            Decimal("300000.00"),
        )
        self.assertEqual(
            self.building.building_wallet_balance,
            Decimal("1000.00"),
        )

    def test_resident_cannot_pay_already_paid_charge(self):
        self.resident_charge1.status = UnitChargeStatus.PAID
        self.resident_charge1.save(update_fields=["status"])

        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [self.resident_charge1.id],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.resident_charge1.refresh_from_db()
        self.unit1.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(
            self.resident_charge1.status,
            UnitChargeStatus.PAID,
        )
        self.assertEqual(
            self.unit1.debt,
            Decimal("500000.00"),
        )
        self.assertEqual(
            self.building.building_wallet_balance,
            Decimal("1000.00"),
        )

    def test_resident_cannot_pay_nonexistent_charge(self):
        self.client.force_authenticate(user=self.resident)

        invalid_charge_id = (
                UnitCharge.objects.order_by("-id").first().id + 1
        )

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [invalid_charge_id],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.unit1.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(
            self.unit1.debt,
            Decimal("500000.00"),
        )
        self.assertEqual(
            self.building.building_wallet_balance,
            Decimal("1000.00"),
        )


class ResidentPaymentIntegrityTests(BaseChargeTestCase):
    """Guards on the money-moving path that the happy-path tests cannot catch."""

    def setUp(self):
        super().setUp()

        self.url = reverse("resident-pay-charges")

        self.master_charge1 = MasterCharge.objects.create(
            title="شارژ شهریور",
            amount_per_unit=Decimal("300000.00"),
            due_date="2026-09-20",
            created_by=self.manager,
        )
        self.master_charge2 = MasterCharge.objects.create(
            title="شارژ تعمیر آسانسور",
            amount_per_unit=Decimal("200000.00"),
            due_date="2026-09-25",
            created_by=self.manager,
        )

        self.resident_charge1 = UnitCharge.objects.create(
            master_charge=self.master_charge1,
            unit=self.unit1,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PENDING,
        )
        self.resident_charge2 = UnitCharge.objects.create(
            master_charge=self.master_charge2,
            unit=self.unit1,
            amount=Decimal("200000.00"),
            status=UnitChargeStatus.PENDING,
        )

    def test_payment_stamps_paid_at(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={"charge_ids": [self.resident_charge1.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.resident_charge1.refresh_from_db()
        self.assertIsNotNone(self.resident_charge1.paid_at)

    def test_pending_charge_has_no_paid_at(self):
        self.assertIsNone(self.resident_charge2.paid_at)

    def test_duplicate_charge_ids_are_rejected(self):
        """A repeated id must not be settled — or paid for — twice."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [
                    self.resident_charge1.id,
                    self.resident_charge1.id,
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.resident_charge1.refresh_from_db()
        self.unit1.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(self.resident_charge1.status, UnitChargeStatus.PENDING)
        self.assertEqual(self.unit1.debt, Decimal("500000.00"))
        self.assertEqual(self.building.building_wallet_balance, Decimal("1000.00"))

    def test_charge_on_a_unit_without_a_building_is_rejected(self):
        """The wallet credit has nowhere to land, so the payment must not apply.

        Without the guard the debt would fall while no building received the
        money, silently destroying it.
        """
        orphan_unit = Unit.objects.create(
            owner=self.resident,
            building=None,
            unit_number="909",
            floor=9,
            area=70.00,
            debt=Decimal("120000.00"),
        )
        orphan_charge = UnitCharge.objects.create(
            master_charge=self.master_charge1,
            unit=orphan_unit,
            amount=Decimal("120000.00"),
            status=UnitChargeStatus.PENDING,
        )

        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={"charge_ids": [orphan_charge.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        orphan_charge.refresh_from_db()
        orphan_unit.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(orphan_charge.status, UnitChargeStatus.PENDING)
        self.assertEqual(orphan_unit.debt, Decimal("120000.00"))
        self.assertEqual(self.building.building_wallet_balance, Decimal("1000.00"))

    def test_a_single_already_paid_charge_rolls_back_the_whole_batch(self):
        """Mixed batches are all-or-nothing: the pending sibling must not settle."""
        self.resident_charge1.status = UnitChargeStatus.PAID
        self.resident_charge1.save(update_fields=["status"])

        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [
                    self.resident_charge1.id,
                    self.resident_charge2.id,
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.resident_charge2.refresh_from_db()
        self.unit1.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(self.resident_charge2.status, UnitChargeStatus.PENDING)
        self.assertEqual(self.unit1.debt, Decimal("500000.00"))
        self.assertEqual(self.building.building_wallet_balance, Decimal("1000.00"))

    def test_paying_across_two_owned_units_debits_each_unit_separately(self):
        """A resident can own several units; each debt must fall by its own share."""
        second_unit = Unit.objects.create(
            owner=self.resident,
            building=self.building,
            unit_number="103",
            floor=1,
            area=75.00,
            debt=Decimal("150000.00"),
        )
        second_unit_charge = UnitCharge.objects.create(
            master_charge=self.master_charge2,
            unit=second_unit,
            amount=Decimal("150000.00"),
            status=UnitChargeStatus.PENDING,
        )

        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.url,
            data={
                "charge_ids": [
                    self.resident_charge1.id,
                    second_unit_charge.id,
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.unit1.refresh_from_db()
        second_unit.refresh_from_db()
        self.building.refresh_from_db()

        self.assertEqual(self.unit1.debt, Decimal("200000.00"))
        self.assertEqual(second_unit.debt, Decimal("0.00"))
        # Both units sit in the same building, so the wallet takes the total.
        self.assertEqual(
            self.building.building_wallet_balance,
            Decimal("1000.00") + Decimal("450000.00"),
        )


class ResidentPaymentHistoryTests(BaseChargeTestCase):
    """The resident's record of what they have already settled."""

    def setUp(self):
        super().setUp()

        self.url = reverse("resident-payment-history")

        self.master_charge = MasterCharge.objects.create(
            title="شارژ مرداد",
            description="نظافت مشاعات",
            amount_per_unit=Decimal("300000.00"),
            due_date="2026-08-20",
            created_by=self.manager,
        )

        self.paid_charge = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit1,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PAID,
            paid_at=timezone.now(),
        )
        self.pending_charge = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit1,
            amount=Decimal("120000.00"),
            status=UnitChargeStatus.PENDING,
        )
        self.other_resident_paid_charge = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit2,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PAID,
            paid_at=timezone.now(),
        )

    def test_resident_sees_only_own_paid_charges_with_master_data(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        charges = response.data["charges"]
        self.assertEqual(len(charges), 1)
        self.assertEqual(charges[0]["id"], self.paid_charge.id)
        self.assertEqual(charges[0]["title"], "شارژ مرداد")
        self.assertEqual(charges[0]["description"], "نظافت مشاعات")
        self.assertEqual(charges[0]["status"], UnitChargeStatus.PAID)
        self.assertIsNotNone(charges[0]["paid_at"])

    def test_history_reports_the_total_paid(self):
        UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit1,
            amount=Decimal("50000.00"),
            status=UnitChargeStatus.PAID,
            paid_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)

        self.assertEqual(response.data["total_paid"], "350000.00")

    def test_history_excludes_pending_charges(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url)

        returned_ids = {charge["id"] for charge in response.data["charges"]}
        self.assertNotIn(self.pending_charge.id, returned_ids)

    def test_history_excludes_other_residents_payments(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.url)

        returned_ids = {charge["id"] for charge in response.data["charges"]}
        self.assertNotIn(self.other_resident_paid_charge.id, returned_ids)

    def test_history_is_empty_when_nothing_has_been_paid(self):
        UnitCharge.objects.filter(unit=self.unit1).delete()

        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)

        self.assertEqual(response.data["charges"], [])
        self.assertEqual(response.data["total_paid"], "0.00")

    def test_charges_paid_before_paid_at_existed_still_appear_last(self):
        """Legacy rows carry no timestamp; they must sort last, not vanish."""
        legacy = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit1,
            amount=Decimal("10000.00"),
            status=UnitChargeStatus.PAID,
            paid_at=None,
        )

        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)

        returned_ids = [charge["id"] for charge in response.data["charges"]]
        self.assertIn(legacy.id, returned_ids)
        self.assertEqual(returned_ids[-1], legacy.id)

    def test_manager_cannot_access_resident_history(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(self.url)

        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )


class ManagerChargeEditTests(BaseChargeTestCase):
    """Correcting a charge that was issued with the wrong details."""

    def setUp(self):
        super().setUp()

        self.unit1.debt = Decimal("0.00")
        self.unit1.save(update_fields=["debt"])
        self.unit2.debt = Decimal("0.00")
        self.unit2.save(update_fields=["debt"])

        self.master_charge = MasterCharge.objects.create(
            title="شارژ شهریور",
            description="نظافت مشاعات",
            amount_per_unit=Decimal("200000.00"),
            due_date="2026-09-20",
            created_by=self.manager,
        )
        self.charge1 = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit1,
            amount=Decimal("200000.00"),
        )
        self.charge2 = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit2,
            amount=Decimal("200000.00"),
        )
        self.unit1.debt = Decimal("200000.00")
        self.unit1.save(update_fields=["debt"])
        self.unit2.debt = Decimal("200000.00")
        self.unit2.save(update_fields=["debt"])

        self.url = reverse("manager-charge-detail", args=[self.master_charge.id])

    def test_manager_edits_title_description_and_due_date(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.url,
            data={
                "title": "شارژ شهریور (اصلاح‌شده)",
                "description": "نظافت و نگهبانی",
                "due_date": "2026-10-01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.master_charge.refresh_from_db()
        self.assertEqual(self.master_charge.title, "شارژ شهریور (اصلاح‌شده)")
        self.assertEqual(self.master_charge.description, "نظافت و نگهبانی")
        self.assertEqual(str(self.master_charge.due_date), "2026-10-01")

    def test_raising_the_amount_raises_every_unit_debt_by_the_delta(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.url,
            data={"amount": "250000.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.master_charge.refresh_from_db()
        self.charge1.refresh_from_db()
        self.charge2.refresh_from_db()
        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()

        self.assertEqual(self.master_charge.amount_per_unit, Decimal("250000.00"))
        self.assertEqual(self.charge1.amount, Decimal("250000.00"))
        self.assertEqual(self.charge2.amount, Decimal("250000.00"))
        self.assertEqual(self.unit1.debt, Decimal("250000.00"))
        self.assertEqual(self.unit2.debt, Decimal("250000.00"))

    def test_lowering_the_amount_lowers_every_unit_debt_by_the_delta(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.url,
            data={"amount_per_unit": "80000.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()
        self.assertEqual(self.unit1.debt, Decimal("80000.00"))
        self.assertEqual(self.unit2.debt, Decimal("80000.00"))

    def test_editing_untouched_units_leaves_their_debt_alone(self):
        """unit3 was never charged, so a re-price must not reach it."""
        self.client.force_authenticate(user=self.manager)

        self.client.patch(self.url, data={"amount": "250000.00"}, format="json")

        self.unit3.refresh_from_db()
        self.assertEqual(self.unit3.debt, Decimal("0.00"))

    def test_amount_is_frozen_once_any_unit_charge_is_paid(self):
        """Paid money is already in the wallet; re-pricing would corrupt the ledger."""
        self.charge2.status = UnitChargeStatus.PAID
        self.charge2.save(update_fields=["status"])

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.url,
            data={"amount": "250000.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.master_charge.refresh_from_db()
        self.charge1.refresh_from_db()
        self.unit1.refresh_from_db()

        self.assertEqual(self.master_charge.amount_per_unit, Decimal("200000.00"))
        self.assertEqual(self.charge1.amount, Decimal("200000.00"))
        self.assertEqual(self.unit1.debt, Decimal("200000.00"))

    def test_title_stays_editable_after_a_payment(self):
        self.charge2.status = UnitChargeStatus.PAID
        self.charge2.save(update_fields=["status"])

        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(
            self.url,
            data={"title": "شارژ شهریور - اصلاح عنوان"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.master_charge.refresh_from_db()
        self.assertEqual(self.master_charge.title, "شارژ شهریور - اصلاح عنوان")

    def test_empty_payload_is_rejected(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(self.url, data={}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_title_is_rejected(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(self.url, data={"title": "   "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.master_charge.refresh_from_db()
        self.assertEqual(self.master_charge.title, "شارژ شهریور")

    def test_non_positive_amount_is_rejected(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.patch(self.url, data={"amount": "0"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.unit1.refresh_from_db()
        self.assertEqual(self.unit1.debt, Decimal("200000.00"))

    def test_editing_a_missing_charge_returns_404(self):
        self.client.force_authenticate(user=self.manager)

        missing = reverse("manager-charge-detail", args=[self.master_charge.id + 999])
        response = self.client.patch(missing, data={"title": "x"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_resident_cannot_edit_a_charge(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.patch(
            self.url,
            data={"amount": "1.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.master_charge.refresh_from_db()
        self.assertEqual(self.master_charge.amount_per_unit, Decimal("200000.00"))

    def test_service_staff_cannot_edit_a_charge(self):
        self.client.force_authenticate(user=self.service_staff)

        response = self.client.patch(self.url, data={"title": "x"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ManagerChargeDeleteTests(BaseChargeTestCase):
    """Cancelling a charge that should never have been issued."""

    def setUp(self):
        super().setUp()

        self.master_charge = MasterCharge.objects.create(
            title="شارژ اشتباه",
            amount_per_unit=Decimal("200000.00"),
            due_date="2026-09-20",
            created_by=self.manager,
        )
        self.charge1 = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit1,
            amount=Decimal("200000.00"),
        )
        self.charge2 = UnitCharge.objects.create(
            master_charge=self.master_charge,
            unit=self.unit2,
            amount=Decimal("200000.00"),
        )

        self.url = reverse("manager-charge-detail", args=[self.master_charge.id])

    def test_manager_cancels_a_charge_and_the_debt_is_rolled_back(self):
        self.client.force_authenticate(user=self.manager)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(MasterCharge.objects.filter(pk=self.master_charge.pk).exists())
        self.assertFalse(UnitCharge.objects.filter(master_charge=self.master_charge.pk).exists())

        self.unit1.refresh_from_db()
        self.unit2.refresh_from_db()
        # Both started at the BaseChargeTestCase amounts before the charge landed.
        self.assertEqual(self.unit1.debt, Decimal("300000.00"))
        self.assertEqual(self.unit2.debt, Decimal("100000.00"))

    def test_cancelling_is_blocked_once_any_unit_charge_is_paid(self):
        self.charge2.status = UnitChargeStatus.PAID
        self.charge2.save(update_fields=["status"])

        self.client.force_authenticate(user=self.manager)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertTrue(MasterCharge.objects.filter(pk=self.master_charge.pk).exists())
        self.unit1.refresh_from_db()
        self.assertEqual(self.unit1.debt, Decimal("500000.00"))

    def test_cancelling_a_missing_charge_returns_404(self):
        self.client.force_authenticate(user=self.manager)

        missing = reverse("manager-charge-detail", args=[self.master_charge.id + 999])
        response = self.client.delete(missing)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_resident_cannot_cancel_a_charge(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MasterCharge.objects.filter(pk=self.master_charge.pk).exists())

    def test_service_staff_cannot_cancel_a_charge(self):
        self.client.force_authenticate(user=self.service_staff)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class FinancialSummaryAPITests(BaseChargeTestCase):
    """Tests for the /api/manager/reports/financial/summary/ endpoint."""

    def setUp(self):
        super().setUp()
        self.url = reverse('manager-financial-summary')

        Unit.objects.update(debt=Decimal('0.00'))

        self.master_charge_1 = MasterCharge.objects.create(
            title="شارژ شهریور",
            amount_per_unit=Decimal("300000.00"),
            due_date="2026-09-20",
            created_by=self.manager,
        )
        self.master_charge_2 = MasterCharge.objects.create(
            title="شارژ تعمیر آسانسور",
            amount_per_unit=Decimal("200000.00"),
            due_date="2026-09-25",
            created_by=self.manager,
        )

        self.paid_1 = UnitCharge.objects.create(
            master_charge=self.master_charge_1,
            unit=self.unit1,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PAID,
        )
        self.paid_2 = UnitCharge.objects.create(
            master_charge=self.master_charge_2,
            unit=self.unit1,
            amount=Decimal("200000.00"),
            status=UnitChargeStatus.PAID,
        )

        self.pending_1 = UnitCharge.objects.create(
            master_charge=self.master_charge_1,
            unit=self.unit2,
            amount=Decimal("300000.00"),
            status=UnitChargeStatus.PENDING,
        )
        self.pending_2 = UnitCharge.objects.create(
            master_charge=self.master_charge_2,
            unit=self.unit2,
            amount=Decimal("200000.00"),
            status=UnitChargeStatus.PENDING,
        )

    def test_manager_can_access_financial_summary(self):
        """Ensure a manager can access the summary and gets correct totals."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_collected_revenue'], '500000.00')
        self.assertEqual(response.data['total_outstanding_debt'], '500000.00')

    def test_unauthorized_roles_cannot_access_summary(self):
        """Non-manager roles get 403 Forbidden."""
        for user in [self.resident, self.service_staff]:
            self.client.force_authenticate(user=user)
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ChargeSearchAPITests(BaseChargeTestCase):
    """Tests for the /api/manager/charges/search/ endpoint."""

    def setUp(self):
        super().setUp()
        self.url = reverse('manager-charge-search')

        Unit.objects.update(debt=Decimal('0.00'))

        self.charge_oct = MasterCharge.objects.create(
            title="شارژ مهرماه",
            amount_per_unit=Decimal("100000.00"),
            due_date="2026-10-20",
            created_by=self.manager,
        )
        self.charge_sep = MasterCharge.objects.create(
            title="شارژ شهریور",
            amount_per_unit=Decimal("150000.00"),
            due_date="2026-09-20",
            created_by=self.manager,
        )

        self.unit_101 = Unit.objects.create(
            owner=self.resident,
            building=self.building,
            unit_number="101",
            floor=1,
            area=80.00,
        )
        self.unit_102 = Unit.objects.create(
            owner=self.other_resident,
            building=self.building,
            unit_number="102",
            floor=1,
            area=90.00,
        )

        self.charge_1 = UnitCharge.objects.create(
            master_charge=self.charge_oct,
            unit=self.unit_101,
            amount=Decimal("100000.00"),
            status=UnitChargeStatus.PENDING,
        )
        self.charge_2 = UnitCharge.objects.create(
            master_charge=self.charge_sep,
            unit=self.unit_102,
            amount=Decimal("150000.00"),
            status=UnitChargeStatus.PAID,
        )
        self.charge_3 = UnitCharge.objects.create(
            master_charge=self.charge_oct,
            unit=self.unit_102,
            amount=Decimal("100000.00"),
            status=UnitChargeStatus.PENDING,
        )

    def test_manager_can_search_by_charge_title(self):
        """Searching by charge title returns matching records."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url, {'search': 'مهر'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        titles = {item['title'] for item in response.data}
        self.assertEqual(titles, {'شارژ مهرماه'})

    def test_manager_can_search_by_unit_number(self):
        """Searching by unit number returns charges for that unit."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url, {'search': '101'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['unit_number'], '101')

    def test_manager_can_search_by_status(self):
        """Searching by charge status returns matching records."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url, {'search': 'Paid'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'Paid')

    def test_manager_can_search_with_no_results(self):
        """Searching for a non-existent term returns an empty list."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url, {'search': 'nonexistent'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_manager_can_get_all_charges_without_search_param(self):
        """Omitting the search parameter returns all charges."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_unauthorized_roles_cannot_access_search(self):
        """Non-manager roles get 403 Forbidden."""
        for user in [self.resident, self.service_staff]:
            self.client.force_authenticate(user=user)
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)