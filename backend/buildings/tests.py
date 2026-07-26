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