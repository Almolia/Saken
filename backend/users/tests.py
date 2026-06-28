from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000000',
            full_name='مدیر ساختمان',
            national_id='1234567890',
            password='123456',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111111',
            full_name='سارا احمدی',
            national_id='1234567891',
            password='123456',
        )

    def test_register_user_successfully(self):
        payload = {
            'full_name': 'علی رضایی',
            'phone': '09123334444',
            'national_id': '1234567892',
            'password': '123456',
            'password_confirmation': '123456',
        }
        response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(phone='09123334444').exists())

    def test_login_successfully_sets_cookie(self):
        response = self.client.post(
            '/api/auth/login/',
            {'phone': '09121111111', 'password': '123456'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['phone'], '09121111111')
        self.assertIn(settings.JWT_ACCESS_COOKIE_NAME, response.cookies)

    def test_login_rejects_disabled_user(self):
        self.resident.is_disabled = True
        self.resident.is_active = False
        self.resident.save(update_fields=['is_disabled', 'is_active'])
        response = self.client.post(
            '/api/auth/login/',
            {'phone': '09121111111', 'password': '123456'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_current_user_requires_authentication(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_manager_can_get_user_list(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'phone': '09120000000', 'password': '123456'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.get('/api/manager/users/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['users']), 2)

    def test_resident_cannot_get_user_list(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'phone': '09121111111', 'password': '123456'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.get('/api/manager/users/')
        self.assertEqual(response.status_code, 403)

    def test_manager_can_disable_resident(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'phone': '09120000000', 'password': '123456'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.patch(
            f'/api/manager/users/{self.resident.id}/status/',
            {'is_disabled': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.is_disabled)
        self.assertFalse(self.resident.is_active)

    def test_bootstrap_manager_only_once(self):
        payload = {
            'full_name': 'مدیر جدید',
            'phone': '09125555555',
            'national_id': '1234567893',
            'password': '123456',
        }
        response = self.client.post('/api/manager/bootstrap/', payload, format='json')
        self.assertEqual(response.status_code, 400)
