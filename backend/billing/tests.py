from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from buildings.models import Building, Unit
from users.models import UserRole
from .models import PeriodicCharge

User = get_user_model()


class PeriodicChargeAPITests(APITestCase):
    def setUp(self):
        self.building = Building.objects.create(name="Saken Tower A")
        self.manager = User.objects.create_user(
            phone="09120000001",
            password="ManagerPassword1",
            full_name="Manager User",
            national_id="0000000001",
            role=UserRole.MANAGER,
        )
        self.resident = User.objects.create_user(
            phone="09120000002",
            password="ResidentPassword1",
            full_name="Resident User",
            national_id="0000000002",
            role=UserRole.RESIDENT,
        )
        self.unit1 = Unit.objects.create(
            owner=self.resident,
            building=self.building,
            unit_number="101",
            floor=1,
            area=80.00,
        )
        self.unit2 = Unit.objects.create(
            building=self.building,
            unit_number="102",
            floor=1,
            area=90.00,
        )
        self.url = reverse("manager-charges")

    def test_manager_can_create_charge_for_all_units(self):
        self.client.force_authenticate(user=self.manager)
        payload = {
            "title": "شارژ شهریور ۱۴۰۵",
            "description": "شارژ عمومی و هزینه نظافت",
            "amount": "500000.00",
            "due_date": "2026-09-20",
            "apply_to_all": True,
        }
        response = self.client.post(self.url, data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["charge"]["title"], "شارژ شهریور ۱۴۰۵")
        self.assertEqual(response.data["charge"]["apply_to_all"], True)
        self.assertEqual(PeriodicCharge.objects.count(), 1)

    def test_manager_can_create_charge_for_specific_units(self):
        self.client.force_authenticate(user=self.manager)
        payload = {
            "title": "شارژ تعمیرات پارکینگ",
            "description": "هزینه تعمیر درب پارکینگ",
            "amount": "300000.00",
            "due_date": "2026-09-25",
            "apply_to_all": False,
            "unit_ids": [self.unit1.id],
        }
        response = self.client.post(self.url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["charge"]["apply_to_all"], False)
        charge = PeriodicCharge.objects.get(pk=response.data["charge"]["id"])
        self.assertEqual(list(charge.units.values_list("id", flat=True)), [self.unit1.id])

    def test_manager_can_list_charges(self):
        PeriodicCharge.objects.create(
            title="شارژ تیر",
            amount=Decimal("400000.00"),
            due_date="2026-07-20",
            apply_to_all=True,
            created_by=self.manager,
        )
        PeriodicCharge.objects.create(
            title="شارژ مرداد",
            amount=Decimal("450000.00"),
            due_date="2026-08-20",
            apply_to_all=True,
            created_by=self.manager,
        )
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["charges"]), 2)
        # Ordered newest first
        self.assertEqual(response.data["charges"][0]["title"], "شارژ مرداد")

    def test_resident_cannot_access_manager_charges(self):
        self.client.force_authenticate(user=self.resident)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
