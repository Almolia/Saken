from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class SelfProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000010',
            username='self-manager',
            full_name='مدیر ساختمان',
            national_id='1234567820',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111120',
            username='self-resident',
            full_name='سارا احمدی',
            national_id='1234567821',
            password='Resident123',
        )
        self.other = User.objects.create_user(
            phone='09123333333',
            username='self-other',
            full_name='کاربر دیگر',
            national_id='1234567822',
            password='Other12345',
        )

    def login_as(self, username, password):
        response = self.client.post(
            '/api/auth/login/',
            {'login': username, 'password': password},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def test_anonymous_cannot_update_profile(self):
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'full_name': 'بدون ورود',
                'username': 'anon',
                'phone': '09120000000',
                'national_id': '1234567890',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_resident_can_update_own_profile(self):
        self.login_as('self-resident', 'Resident123')
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'full_name': 'سارا احمدی ویرایش شده',
                'username': 'sara-edited',
                'phone': '09121111121',
                'national_id': '1234567821',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.full_name, 'سارا احمدی ویرایش شده')
        self.assertEqual(self.resident.username, 'sara-edited')
        self.assertEqual(self.resident.phone, '09121111121')
        self.assertEqual(response.data['user']['full_name'], 'سارا احمدی ویرایش شده')
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)

    def test_resident_can_update_profile_and_change_password(self):
        self.login_as('self-resident', 'Resident123')
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'full_name': 'سارا احمدی',
                'username': 'self-resident',
                'phone': '09121111120',
                'national_id': '1234567821',
                'current_password': 'Resident123',
                'new_password': 'Resident12345',
                'new_password_confirmation': 'Resident12345',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password('Resident12345'))

    def test_resident_can_change_own_password(self):
        self.login_as('self-resident', 'Resident123')
        response = self.client.post(
            '/api/auth/change-password/',
            {
                'current_password': 'Resident123',
                'new_password': 'NewResident123',
                'new_password_confirmation': 'NewResident123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password('NewResident123'))

    def test_resident_rejects_wrong_current_password(self):
        self.login_as('self-resident', 'Resident123')
        response = self.client.post(
            '/api/auth/change-password/',
            {
                'current_password': 'WrongPass123',
                'new_password': 'NewResident123',
                'new_password_confirmation': 'NewResident123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_resident_cannot_take_existing_phone(self):
        self.login_as('self-resident', 'Resident123')
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'full_name': 'سارا احمدی',
                'username': 'self-resident',
                'phone': '09123333333',
                'national_id': '1234567821',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.phone, '09121111120')

    def test_manager_can_update_own_profile(self):
        self.login_as('self-manager', 'Manager123')
        response = self.client.patch(
            '/api/auth/profile/',
            {
                'full_name': 'مدیر ویرایش شده',
                'username': 'manager-edited',
                'phone': '09120000011',
                'national_id': '1234567820',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.full_name, 'مدیر ویرایش شده')
        self.assertEqual(self.manager.username, 'manager-edited')
        self.assertEqual(self.manager.phone, '09120000011')

    def test_manager_can_change_own_password(self):
        self.login_as('self-manager', 'Manager123')
        response = self.client.post(
            '/api/auth/change-password/',
            {
                'current_password': 'Manager123',
                'new_password': 'NewManager123',
                'new_password_confirmation': 'NewManager123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.manager.refresh_from_db()
        self.assertTrue(self.manager.check_password('NewManager123'))
