from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()

ROLE_URL = '/api/manager/users/{pk}/role/'


class ServiceStaffRoleAssignmentTests(TestCase):
    """Covers granting the service_staff role through the role-update endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            phone='09129999998',
            username='role-admin',
            full_name='ادمین سیستم',
            national_id='1234567800',
            password='Admin1234',
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        self.manager = User.objects.create_user(
            phone='09120000002',
            username='role-manager',
            full_name='مدیر ساختمان',
            national_id='1234567801',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111112',
            username='role-resident',
            full_name='سارا احمدی',
            national_id='1234567802',
            password='Resident123',
        )
        self.service_staff = User.objects.create_user(
            phone='09121111113',
            username='role-service',
            full_name='متین محمودی',
            national_id='1234567803',
            password='Service123',
            role='service_staff',
        )

    def login_as(self, username, password):
        response = self.client.post(
            '/api/auth/login/',
            {'login': username, 'password': password},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def set_role(self, user, role):
        return self.client.patch(ROLE_URL.format(pk=user.pk), {'role': role}, format='json')

    def test_admin_can_grant_service_staff_role(self):
        self.login_as('role-admin', 'Admin1234')

        response = self.set_role(self.resident, 'service_staff')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['role'], 'service_staff')
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.role, 'service_staff')

    def test_manager_can_grant_service_staff_role(self):
        self.login_as('role-manager', 'Manager123')

        response = self.set_role(self.resident, 'service_staff')

        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.role, 'service_staff')

    def test_service_staff_does_not_get_django_admin_access(self):
        self.login_as('role-admin', 'Admin1234')

        self.set_role(self.resident, 'service_staff')

        self.resident.refresh_from_db()
        self.assertFalse(self.resident.is_staff)

    def test_service_staff_role_can_be_reverted_to_resident(self):
        self.login_as('role-admin', 'Admin1234')

        response = self.set_role(self.service_staff, 'resident')

        self.assertEqual(response.status_code, 200)
        self.service_staff.refresh_from_db()
        self.assertEqual(self.service_staff.role, 'resident')

    def test_registered_user_starts_as_resident_and_can_be_promoted(self):
        payload = {
            'full_name': 'کارمند خدمات',
            'username': 'new-service',
            'phone': '09123335555',
            'national_id': '1234567804',
            'password': 'Abcd1234',
            'password_confirmation': 'Abcd1234',
        }
        register_response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(register_response.status_code, 201)
        self.assertEqual(register_response.json()['user']['role'], 'resident')

        new_user = User.objects.get(username='new-service')
        self.login_as('role-admin', 'Admin1234')
        response = self.set_role(new_user, 'service_staff')

        self.assertEqual(response.status_code, 200)
        new_user.refresh_from_db()
        self.assertEqual(new_user.role, 'service_staff')

    def test_stats_report_the_service_staff_count(self):
        self.login_as('role-admin', 'Admin1234')

        response = self.client.get('/api/manager/users/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['stats']['service_staff'], 1)


class RoleUpdateBoundaryTests(TestCase):
    """Guards on the role-update endpoint now that managers may also call it."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            phone='09129999997',
            username='guard-admin',
            full_name='ادمین سیستم',
            national_id='1234567810',
            password='Admin1234',
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        self.manager = User.objects.create_user(
            phone='09120000003',
            username='guard-manager',
            full_name='مدیر ساختمان',
            national_id='1234567811',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111114',
            username='guard-resident',
            full_name='سارا احمدی',
            national_id='1234567812',
            password='Resident123',
        )
        self.service_staff = User.objects.create_user(
            phone='09121111115',
            username='guard-service',
            full_name='متین محمودی',
            national_id='1234567813',
            password='Service123',
            role='service_staff',
        )

    def login_as(self, username, password):
        response = self.client.post(
            '/api/auth/login/',
            {'login': username, 'password': password},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def set_role(self, user, role):
        return self.client.patch(ROLE_URL.format(pk=user.pk), {'role': role}, format='json')

    def test_resident_cannot_change_roles(self):
        self.login_as('guard-resident', 'Resident123')

        response = self.set_role(self.service_staff, 'manager')

        self.assertEqual(response.status_code, 403)
        self.service_staff.refresh_from_db()
        self.assertEqual(self.service_staff.role, 'service_staff')

    def test_service_staff_cannot_change_roles(self):
        self.login_as('guard-service', 'Service123')

        response = self.set_role(self.resident, 'manager')

        self.assertEqual(response.status_code, 403)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.role, 'resident')

    def test_anonymous_user_cannot_change_roles(self):
        response = self.set_role(self.resident, 'service_staff')

        self.assertEqual(response.status_code, 401)

    def test_admin_role_stays_immutable(self):
        self.login_as('guard-manager', 'Manager123')

        response = self.set_role(self.admin, 'resident')

        self.assertEqual(response.status_code, 400)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, 'admin')

    def test_user_cannot_change_their_own_role(self):
        self.login_as('guard-manager', 'Manager123')

        response = self.set_role(self.manager, 'resident')

        self.assertEqual(response.status_code, 400)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.role, 'manager')

    def test_admin_role_cannot_be_granted_through_the_endpoint(self):
        self.login_as('guard-admin', 'Admin1234')

        response = self.set_role(self.resident, 'admin')

        self.assertEqual(response.status_code, 400)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.role, 'resident')
