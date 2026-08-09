from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from amenities.models import Amenity

User = get_user_model()


class AmenityManagerTests(APITestCase):
    """Tests for Manager creating and updating amenities."""

    def setUp(self):
        # Create a manager user with unique national_id
        self.manager = User.objects.create_user(
            phone='09121110001',
            password='ManagerPass123',
            full_name='Building Manager',
            national_id='1111111111',
            role='manager',
        )
        # Create another manager for additional tests
        self.manager2 = User.objects.create_user(
            phone='09121110002',
            password='Manager2Pass123',
            full_name='Another Manager',
            national_id='1111111112',
            role='manager',
        )

        self.list_url = reverse('manager-amenities')
        self.valid_payload = {
            'name': 'باشگاه ورزشی',
            'description': 'باشگاه بدنسازی با تجهیزات کامل',
            'operating_rules': '08:00 تا 22:00 - شنبه تا چهارشنبه',
            'is_active': True,
        }

    def test_manager_can_create_amenity(self):
        """Manager creates a new amenity via POST, expects 201 Created."""
        self.client.force_authenticate(user=self.manager)

        response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'امکان با موفقیت ایجاد شد.')
        self.assertEqual(response.data['amenity']['name'], 'باشگاه ورزشی')
        self.assertEqual(response.data['amenity']['description'], 'باشگاه بدنسازی با تجهیزات کامل')
        self.assertEqual(response.data['amenity']['operating_rules'], '08:00 تا 22:00 - شنبه تا چهارشنبه')
        self.assertTrue(response.data['amenity']['is_active'])
        self.assertIn('id', response.data['amenity'])
        self.assertIn('created_at', response.data['amenity'])
        self.assertIn('updated_at', response.data['amenity'])

        # Verify database insertion
        self.assertEqual(Amenity.objects.count(), 1)
        amenity = Amenity.objects.first()
        self.assertEqual(amenity.name, 'باشگاه ورزشی')
        self.assertEqual(amenity.description, 'باشگاه بدنسازی با تجهیزات کامل')
        self.assertTrue(amenity.is_active)

    def test_manager_can_update_amenity_is_active_status(self):
        """Manager updates is_active status via PATCH, expects 200 OK."""
        self.client.force_authenticate(user=self.manager)

        # Create an amenity first
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Update is_active to False
        patch_payload = {'is_active': False}
        response = self.client.patch(detail_url, patch_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'امکان با موفقیت به‌روزرسانی شد.')
        self.assertEqual(response.data['amenity']['is_active'], False)

        # Verify database update
        amenity = Amenity.objects.get(pk=amenity_id)
        self.assertFalse(amenity.is_active)

    def test_manager_can_update_all_amenity_fields(self):
        """Manager can update all fields of an amenity."""
        self.client.force_authenticate(user=self.manager)

        # Create an amenity
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Update all fields
        update_payload = {
            'name': 'استخر سرپوشیده',
            'description': 'استخر ۲۵ متری با رختکن',
            'operating_rules': '06:00 تا 21:00 - هر روز',
            'is_active': True,
        }
        response = self.client.patch(detail_url, update_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['amenity']['name'], 'استخر سرپوشیده')
        self.assertEqual(response.data['amenity']['description'], 'استخر ۲۵ متری با رختکن')
        self.assertEqual(response.data['amenity']['operating_rules'], '06:00 تا 21:00 - هر روز')
        self.assertTrue(response.data['amenity']['is_active'])

    def test_manager_can_delete_amenity(self):
        """Manager can delete an amenity."""
        self.client.force_authenticate(user=self.manager)

        # Create an amenity
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Delete the amenity
        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'امکان با موفقیت حذف شد.')
        self.assertEqual(Amenity.objects.count(), 0)

    def test_manager_can_list_amenities(self):
        """Manager can list all amenities."""
        self.client.force_authenticate(user=self.manager)

        # Create two amenities
        Amenity.objects.create(name='پارکینگ', description='پارکینگ طبقاتی')
        Amenity.objects.create(name='لابی', description='لابی مجلل')

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['amenities']), 2)

    def test_manager_can_get_single_amenity(self):
        """Manager can get details of a single amenity."""
        self.client.force_authenticate(user=self.manager)

        # Create an amenity
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'باشگاه ورزشی')

    def test_manager_cannot_create_amenity_without_name(self):
        """Manager cannot create an amenity without a name."""
        self.client.force_authenticate(user=self.manager)

        invalid_payload = {
            'name': '',
            'description': 'توضیحات',
            'is_active': True,
        }

        response = self.client.post(self.list_url, invalid_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_cannot_create_amenity_with_whitespace_only_name(self):
        """Manager cannot create an amenity with whitespace-only name."""
        self.client.force_authenticate(user=self.manager)

        invalid_payload = {
            'name': '   ',
            'description': 'توضیحات',
            'is_active': True,
        }

        response = self.client.post(self.list_url, invalid_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AmenityResidentSecurityTests(APITestCase):
    """Security tests: Resident cannot create or edit amenities."""

    def setUp(self):
        # Create a resident user with unique national_id
        self.resident = User.objects.create_user(
            phone='09129999991',
            password='ResidentPass123',
            full_name='Test Resident',
            national_id='9999999991',
            role='resident',
        )
        # Create a manager to create test amenities with unique national_id
        self.manager = User.objects.create_user(
            phone='09120000001',
            password='ManagerPass123',
            full_name='Test Manager',
            national_id='0000000001',
            role='manager',
        )

        self.list_url = reverse('manager-amenities')
        self.valid_payload = {
            'name': 'فضای سبز',
            'description': 'باغچه و فضای سبز',
            'operating_rules': '۰۶:۰۰ تا ۲۲:۰۰',
            'is_active': True,
        }

    def test_resident_cannot_create_amenity(self):
        """Resident attempting POST to create amenity gets 403 Forbidden."""
        self.client.force_authenticate(user=self.resident)

        response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Amenity.objects.count(), 0)

    def test_resident_cannot_update_amenity(self):
        """Resident attempting PATCH to edit amenity gets 403 Forbidden."""
        self.client.force_authenticate(user=self.manager)

        # Manager creates an amenity
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Switch to resident
        self.client.force_authenticate(user=self.resident)

        patch_payload = {'is_active': False}
        response = self.client.patch(detail_url, patch_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Verify the amenity was not modified
        amenity = Amenity.objects.get(pk=amenity_id)
        self.assertTrue(amenity.is_active)

    def test_resident_cannot_delete_amenity(self):
        """Resident attempting DELETE on amenity gets 403 Forbidden."""
        self.client.force_authenticate(user=self.manager)

        # Manager creates an amenity
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Switch to resident
        self.client.force_authenticate(user=self.resident)

        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Verify the amenity still exists
        self.assertEqual(Amenity.objects.count(), 1)

    def test_resident_can_list_amenities(self):
        """Resident CAN list amenities (they need to see facilities to book them)."""
        self.client.force_authenticate(user=self.manager)

        # Manager creates amenities
        Amenity.objects.create(name='پارکینگ', operating_rules='۲۴ ساعته')
        Amenity.objects.create(name='باشگاه', operating_rules='۰۸:۰۰ تا ۲۲:۰۰')

        # Switch to resident
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['amenities']), 2)

    def test_resident_can_get_single_amenity(self):
        """Resident CAN get details of a single amenity."""
        self.client.force_authenticate(user=self.manager)

        # Manager creates an amenity
        create_response = self.client.post(
            self.list_url,
            self.valid_payload,
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Switch to resident
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'فضای سبز')


class AmenityUnauthenticatedTests(APITestCase):
    """Tests for unauthenticated access to amenities API."""

    def setUp(self):
        self.list_url = reverse('manager-amenities')

    def test_unauthenticated_cannot_list_amenities(self):
        """Unauthenticated requests are rejected."""
        self.client.force_authenticate(user=None)

        response = self.client.get(self.list_url)

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_unauthenticated_cannot_create_amenity(self):
        """Unauthenticated POST is rejected."""
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.list_url,
            {'name': 'تست'},
            format='json',
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )


class AmenityValidationTests(APITestCase):
    """Tests for input validation on amenity endpoints."""

    def setUp(self):
        self.manager = User.objects.create_user(
            phone='09121111003',
            password='ManagerPass123',
            full_name='Test Manager',
            national_id='1111111103',
            role='manager',
        )
        self.list_url = reverse('manager-amenities')

    def test_amenity_name_trimmed_on_create(self):
        """Amenity name is trimmed when created."""
        self.client.force_authenticate(user=self.manager)

        payload = {
            'name': '  باشگاه ورزشی  ',
            'description': 'توضیحات',
            'is_active': True,
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['amenity']['name'], 'باشگاه ورزشی')

    def test_amenity_description_is_optional(self):
        """Description field is optional."""
        self.client.force_authenticate(user=self.manager)

        payload = {
            'name': 'پارکینگ',
            'is_active': True,
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['amenity']['description'], '')

    def test_amenity_operating_rules_is_optional(self):
        """operating_rules field is optional."""
        self.client.force_authenticate(user=self.manager)

        payload = {
            'name': 'پارکینگ',
            'description': 'پارکینگ مهمان',
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['amenity']['operating_rules'], '')

    def test_amenity_is_active_defaults_to_true(self):
        """is_active defaults to True when not provided."""
        self.client.force_authenticate(user=self.manager)

        payload = {
            'name': 'پارکینگ',
            'description': 'پارکینگ مهمان',
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['amenity']['is_active'])

    def test_404_on_nonexistent_amenity(self):
        """Requesting a non-existent amenity returns 404."""
        self.client.force_authenticate(user=self.manager)

        detail_url = reverse('manager-amenity-detail', kwargs={'pk': 99999})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], 'امکان مورد نظر یافت نشد.')

    def test_manager_cannot_update_with_empty_name(self):
        """Manager cannot update amenity with empty name."""
        self.client.force_authenticate(user=self.manager)

        # Create an amenity
        create_response = self.client.post(
            self.list_url,
            {'name': 'پارکینگ'},
            format='json',
        )
        amenity_id = create_response.data['amenity']['id']
        detail_url = reverse('manager-amenity-detail', kwargs={'pk': amenity_id})

        # Try to update with empty name
        patch_payload = {'name': ''}
        response = self.client.patch(detail_url, patch_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
