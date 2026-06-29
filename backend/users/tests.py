from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            phone='09129999999',
            username='admin2',
            full_name='ادمین سیستم',
            national_id='1234567899',
            password='admin123',
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        self.manager = User.objects.create_user(
            phone='09120000000',
            username='manager',
            full_name='مدیر ساختمان',
            national_id='1234567890',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111111',
            username='resident',
            full_name='سارا احمدی',
            national_id='1234567891',
            password='Resident123',
        )

    def test_register_user_successfully(self):
        payload = {
            'full_name': 'علی رضایی',
            'username': 'ali-rezaei',
            'phone': '09123334444',
            'national_id': '1234567892',
            'password': 'Abcd1234',
            'password_confirmation': 'Abcd1234',
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(phone='09123334444', username='ali-rezaei').exists())

    def test_register_rejects_weak_password(self):
        payload = {
            'full_name': 'علی رضایی',
            'phone': '09123334444',
            'national_id': '1234567892',
            'password': '12345678',
            'password_confirmation': '12345678',
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_login_with_username_phone_or_national_id(self):
        for login_value in ['resident', '09121111111', '1234567891']:
            response = self.client.post(
                '/api/auth/login/',
                {'login': login_value, 'password': 'Resident123'},
                format='json',
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['user']['phone'], '09121111111')
            self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)


    def test_login_works_even_with_stale_access_cookie(self):
        self.client.cookies[settings.JWT_ACCESS_COOKIE_NAME] = 'invalid-or-expired-token'
        response = self.client.post(
            '/api/auth/login/',
            {'login': 'resident', 'password': 'Resident123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['phone'], '09121111111')
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)

    def test_me_with_stale_access_cookie_returns_plain_unauthorized(self):
        self.client.cookies[settings.JWT_ACCESS_COOKIE_NAME] = 'invalid-or-expired-token'
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_current_user_requires_authentication(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_manager_can_get_user_list(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'manager', 'password': 'Manager123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.get('/api/manager/users/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['users']), 4)
        self.assertIn('managers', response.data['stats'])
        self.assertIn('residents', response.data['stats'])

    def test_resident_cannot_get_user_list(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'resident', 'password': 'Resident123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.get('/api/manager/users/')
        self.assertEqual(response.status_code, 403)

    def test_status_toggle_endpoint_is_removed(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'manager', 'password': 'Manager123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.patch(
            f'/api/manager/users/{self.resident.id}/status/',
            {'is_disabled': True},
            format='json',
        )
        self.assertEqual(response.status_code, 404)

    def test_admin_can_change_resident_role_to_manager(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'admin2', 'password': 'admin123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.patch(
            f'/api/manager/users/{self.resident.id}/role/',
            {'role': 'manager'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.role, 'manager')
        self.assertTrue(self.resident.is_staff)

    def test_manager_cannot_change_roles(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'manager', 'password': 'Manager123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.patch(
            f'/api/manager/users/{self.resident.id}/role/',
            {'role': 'manager'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_can_change_own_password(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'admin2', 'password': 'admin123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.post(
            '/api/auth/admin/change-password/',
            {
                'current_password': 'admin123',
                'new_password': 'Newadmin123',
                'new_password_confirmation': 'Newadmin123',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password('Newadmin123'))


    def test_admin_can_update_profile_and_password_from_settings(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'login': 'admin2', 'password': 'admin123'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.patch(
            '/api/auth/admin/profile/',
            {
                'full_name': 'ادمین ویرایش شده',
                'username': 'main-admin',
                'phone': '09128888888',
                'national_id': '1111111111',
                'current_password': 'admin123',
                'new_password': 'Admin12345',
                'new_password_confirmation': 'Admin12345',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.full_name, 'ادمین ویرایش شده')
        self.assertEqual(self.admin.username, 'main-admin')
        self.assertEqual(self.admin.phone, '09128888888')
        self.assertEqual(self.admin.national_id, '1111111111')
        self.assertTrue(self.admin.check_password('Admin12345'))
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)
