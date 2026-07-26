from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from buildings.models import Building, Unit

User = get_user_model()

class ResidentUnitAPITests(APITestCase):
    
    def setUp(self):
        # 1. Create a mock Building
        self.building = Building.objects.create(name="Saken Tower A")

        # 2. Create User A and assign them a Unit
        self.user_a = User.objects.create_user(username='userA', password='passwordA')
        self.unit_a = Unit.objects.create(
            owner=self.user_a, 
            building=self.building,
            unit_number="101",
            floor=1,
            area=75.50
        )
        
        # 3. Create User B and assign them a Unit (for our isolation test)
        self.user_b = User.objects.create_user(username='userB', password='passwordB')
        self.unit_b = Unit.objects.create(
            owner=self.user_b, 
            building=self.building,
            unit_number="102",
            floor=1,
            area=85.00
        )

        # 4. Define the resident URL
        self.my_unit_url = reverse('my-unit')

    def test_logged_in_resident_can_fetch_own_unit_data(self):
        """User A gets a 200 OK and their specific unit data."""
        self.client.force_authenticate(user=self.user_a)
        
        response = self.client.get(self.my_unit_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Assert that the correct unit number and floor are returned
        self.assertEqual(response.data['unit_number'], "101")
        self.assertEqual(response.data['floor'], 1)

    