from decimal import Decimal

from buildings.models import Building, Unit
from django.contrib.auth import get_user_model
from django.urls import reverse
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
            Decimal("1500.00"),
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
