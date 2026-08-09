from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from buildings.models import Building, Unit


User = get_user_model()

class ResidentUnitAPITests(APITestCase):
    
    def setUp(self):
        self.building = Building.objects.create(name="Saken Tower A")

        self.user_a = User.objects.create_user(
            phone='09121111111', 
            password='passwordA',
            full_name='Resident A',
            national_id='1111111111'
        )
        self.unit_a = Unit.objects.create(
            owner=self.user_a, 
            building=self.building,
            unit_number="101",
            floor=1,
            area=75.50
        )

        self.user_b = User.objects.create_user(
            phone='09122222222', 
            password='passwordB',
            full_name='Resident B',
            national_id='2222222222'
        )
        self.unit_b = Unit.objects.create(
            owner=self.user_b, 
            building=self.building,
            unit_number="102",
            floor=1,
            area=85.00
        )

        self.my_unit_url = reverse('my-unit')

    def test_logged_in_resident_can_fetch_own_unit_data(self):
        """User A gets a 200 OK and their specific unit data."""
        self.client.force_authenticate(user=self.user_a)
        
        response = self.client.get(self.my_unit_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Assert that the correct unit number and floor are returned
        self.assertEqual(response.data['unit_number'], "101")
        self.assertEqual(response.data['floor'], 1)

    def test_resident_unit_response_includes_read_only_unit_debt(self):
        """Issue #77 — /my-unit/ exposes unit_debt as a read-only field."""
        from decimal import Decimal
        self.unit_a.debt = Decimal("125000.00")
        self.unit_a.save(update_fields=["debt"])

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(self.my_unit_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_number"], "101")
        self.assertEqual(response.data["unit_debt"], "125000.00")

        # The read-only guard lives on the serializer: the field must never be
        # writable by a resident via PUT/PATCH.
        from buildings.serializers import UnitSerializer
        field = UnitSerializer().fields["unit_debt"]
        self.assertTrue(field.read_only)

    def test_resident_cannot_modify_unit_debt_via_patch(self):
        """Residents cannot alter their own balance — the read-only constraint holds.

        Two layers are verified:
        1. The resident-facing unit endpoint only exposes GET, so a PATCH to
           change unit_debt is rejected outright (405).
        2. Even through the serializer (the actual read-only guard), supplying a
           unit_debt value is silently ignored: it never reaches validated_data
           and the stored balance is unchanged.
        """
        from decimal import Decimal
        from buildings.serializers import UnitSerializer

        self.unit_a.debt = Decimal("125000.00")
        self.unit_a.save(update_fields=["debt"])

        # Layer 1 — PATCH on the resident unit endpoint is not allowed.
        self.client.force_authenticate(user=self.user_a)
        patch_response = self.client.patch(
            self.my_unit_url,
            {"unit_debt": "0.00"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Layer 2 — even if a serializer update were attempted, unit_debt is
        # read-only: it is ignored from validated_data and the balance persists.
        serializer = UnitSerializer(
            self.unit_a,
            data={"unit_debt": "0.00"},
            partial=True,
        )
        self.assertTrue(serializer.is_valid())
        self.assertNotIn("unit_debt", serializer.validated_data)
        serializer.save()

        self.unit_a.refresh_from_db()
        self.assertEqual(self.unit_a.debt, Decimal("125000.00"))

    def test_unauthenticated_request_fails(self):
        """Unauthenticated requests are rejected with a 401 or 403."""
        self.client.force_authenticate(user=None) 
        
        response = self.client.get(self.my_unit_url)
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_system_strictly_filters_by_authenticated_user(self):
        """Proves User A only receives their own data and cannot access User B's unit."""
        self.client.force_authenticate(user=self.user_a)
        
        response = self.client.get(self.my_unit_url)
        
        # Verify it successfully fetched a unit
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Prove strict filtering: the returned unit MUST be unit_a (101) 
        self.assertEqual(response.data['unit_number'], "101")
        
        # Explicitly prove it is NOT User B's unit (102)
        self.assertNotEqual(response.data['unit_number'], "102")


class ManagerAdminAPITests(APITestCase):
    def setUp(self):
        self.building = Building.objects.create(name="Old Saken Name", building_wallet_balance="5000.00")

        self.manager = User.objects.create_user(
            phone='99988877766', full_name='The Manager', national_id='9998887776', role='manager', password='pw'
        )
        self.resident = User.objects.create_user(
            phone='11122233344', full_name='The Resident', national_id='1112223334', role='resident', password='pw'
        )
        self.staff = User.objects.create_user(
            phone='55544433322', full_name='The Staff', national_id='5554443332', role='service_staff', password='pw'
        )

        self.unit = Unit.objects.create(
            unit_number="101", floor=1, area="75.00", building=self.building, owner=self.resident
        )

        self.building_url = reverse('manager-building')
        self.unit_detail_url = reverse('manager-unit-detail', kwargs={'pk': self.unit.pk})

    def test_manager_can_update_building_and_unlink_resident(self):
        """Asserts a 200 OK and verifies the correct database state for both Building and Unit."""
        self.client.force_authenticate(user=self.manager)

        # 1. Update the building name (adding format='json')
        building_payload = {"name": "Saken Tower Primary"}
        b_response = self.client.patch(self.building_url, data=building_payload, format='json')

        self.assertEqual(b_response.status_code, status.HTTP_200_OK)
        self.building.refresh_from_db()
        self.assertEqual(self.building.name, "Saken Tower Primary")

        # 2. Unlink the resident using resident_id: null (adding format='json')
        unit_payload = {"resident_id": None}
        u_response = self.client.patch(self.unit_detail_url, data=unit_payload, format='json')

        self.assertEqual(u_response.status_code, status.HTTP_200_OK)
        self.unit.refresh_from_db()
        self.assertIsNone(self.unit.owner)

    def test_unauthorized_roles_are_forbidden(self):
        """Asserts a 403 Forbidden failure when a resident or staff member accesses manager endpoints."""

        # Test Resident Access
        self.client.force_authenticate(user=self.resident)
        self.assertEqual(self.client.get(self.building_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(self.unit_detail_url, data={}).status_code, status.HTTP_403_FORBIDDEN)

        # Test Service Staff Access
        self.client.force_authenticate(user=self.staff)
        self.assertEqual(self.client.get(self.building_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(self.unit_detail_url, data={}).status_code, status.HTTP_403_FORBIDDEN)