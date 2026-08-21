from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from polls.models import Poll, PollStatus
from rest_framework.test import APIClient

User = get_user_model()


class PollAuthorizationTests(TestCase):
    """Authorization tests ensuring only managers can access poll endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000000',
            username='auth-manager',
            full_name='مدیر ساختمان',
            national_id='1234567890',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111111',
            username='auth-resident',
            full_name='سارا احمدی',
            national_id='1234567891',
            password='Resident123',
            role='resident',
        )
        self.service_staff = User.objects.create_user(
            phone='09122222222',
            username='auth-staff',
            full_name='نیروی خدمات',
            national_id='1234567892',
            password='Service123',
            role='service_staff',
        )

        self.future_end = timezone.now() + timezone.timedelta(days=7)

    def login_as(self, username, password):
        response = self.client.post(
            '/api/auth/login/',
            {'login': username, 'password': password},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def test_resident_receives_403_on_poll_create(self):
        """Assert a Resident receives 403 Forbidden when calling the create endpoint."""
        self.login_as('auth-resident', 'Resident123')

        payload = {
            'title': 'نظرسنجی تست',
            'description': 'توضیحات',
            'status': 'Draft',
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')
        self.assertEqual(response.status_code, 403)

        self.assertEqual(Poll.objects.count(), 0)

    def test_service_staff_receives_403_on_poll_create(self):
        """Assert a Service Staff user receives 403 Forbidden when calling the create endpoint."""
        self.login_as('auth-staff', 'Service123')

        payload = {
            'title': 'نظرسنجی تست',
            'description': 'توضیحات',
            'status': 'Draft',
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')
        self.assertEqual(response.status_code, 403)

        self.assertEqual(Poll.objects.count(), 0)

    def test_resident_receives_403_on_poll_list(self):
        """Assert a Resident receives 403 Forbidden when calling the list endpoint."""
        Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-resident', 'Resident123')

        response = self.client.get('/api/manager/polls/')
        self.assertEqual(response.status_code, 403)

    def test_service_staff_receives_403_on_poll_list(self):
        """Assert a Service Staff user receives 403 Forbidden when calling the list endpoint."""
        Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-staff', 'Service123')

        response = self.client.get('/api/manager/polls/')
        self.assertEqual(response.status_code, 403)

    def test_resident_receives_403_on_poll_detail(self):
        """Assert a Resident receives 403 Forbidden when calling the detail endpoint."""
        poll = Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-resident', 'Resident123')

        response = self.client.get(f'/api/manager/polls/{poll.id}/')
        self.assertEqual(response.status_code, 403)

    def test_service_staff_receives_403_on_poll_detail(self):
        """Assert a Service Staff user receives 403 Forbidden when calling the detail endpoint."""
        poll = Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-staff', 'Service123')

        response = self.client.get(f'/api/manager/polls/{poll.id}/')
        self.assertEqual(response.status_code, 403)

    def test_resident_receives_403_on_poll_update(self):
        """Assert a Resident receives 403 Forbidden when calling the update endpoint."""
        poll = Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-resident', 'Resident123')

        response = self.client.patch(
            f'/api/manager/polls/{poll.id}/',
            {'title': 'عنوان هک شده'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

        poll.refresh_from_db()
        self.assertEqual(poll.title, 'نظرسنجی تست')

    def test_service_staff_receives_403_on_poll_update(self):
        """Assert a Service Staff user receives 403 Forbidden when calling the update endpoint."""
        poll = Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-staff', 'Service123')

        response = self.client.patch(
            f'/api/manager/polls/{poll.id}/',
            {'title': 'عنوان هک شده'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

        poll.refresh_from_db()
        self.assertEqual(poll.title, 'نظرسنجی تست')

    def test_resident_receives_403_on_poll_delete(self):
        """Assert a Resident receives 403 Forbidden when calling the delete endpoint."""
        poll = Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-resident', 'Resident123')

        response = self.client.delete(f'/api/manager/polls/{poll.id}/')
        self.assertEqual(response.status_code, 403)

        self.assertTrue(Poll.objects.filter(pk=poll.id).exists())

    def test_service_staff_receives_403_on_poll_delete(self):
        """Assert a Service Staff user receives 403 Forbidden when calling the delete endpoint."""
        poll = Poll.objects.create(
            title='نظرسنجی تست',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

        self.login_as('auth-staff', 'Service123')

        response = self.client.delete(f'/api/manager/polls/{poll.id}/')
        self.assertEqual(response.status_code, 403)

        self.assertTrue(Poll.objects.filter(pk=poll.id).exists())

    def test_manager_can_access_all_manager_endpoints(self):
        """Assert a Manager can access all poll endpoints."""
        self.login_as('auth-manager', 'Manager123')

        starts_at = (timezone.now() + timezone.timedelta(hours=1)).isoformat()

        payload = {
            'title': 'نظرسنجی مدیر',
            'description': 'توضیحات',
            'status': 'Draft',
            'starts_at': starts_at,
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        create_response = self.client.post('/api/manager/polls/', payload, format='json')
        self.assertEqual(create_response.status_code, 201)
        poll_id = create_response.data['poll']['id']

        list_response = self.client.get('/api/manager/polls/')
        self.assertEqual(list_response.status_code, 200)

        detail_response = self.client.get(f'/api/manager/polls/{poll_id}/')
        self.assertEqual(detail_response.status_code, 200)

        patch_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {'title': 'عنوان ویرایش شده'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, 200)

        publish_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {
                'status': 'Active',
                'starts_at': starts_at,
            },
            format='json',
        )
        self.assertEqual(publish_response.status_code, 200)
        self.assertEqual(publish_response.data['message'], 'نظرسنجی با موفقیت منتشر شد.')

        poll = Poll.objects.get(pk=poll_id)
        self.assertEqual(poll.status, PollStatus.ACTIVE)

        close_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {'status': 'Closed'},
            format='json',
        )
        self.assertEqual(close_response.status_code, 200)
        self.assertEqual(close_response.data['message'], 'نظرسنجی با موفقیت بسته شد.')

        poll.refresh_from_db()
        self.assertEqual(poll.status, PollStatus.CLOSED)

    def test_manager_receives_403_on_resident_poll_vote(self):
        vote_url = reverse("resident-poll-vote", kwargs={"pk": 1})

        self.client.force_authenticate(user=self.manager)

        response = self.client.post(vote_url, {}, format="json")

        self.assertEqual(response.status_code, 403)


class PollManagerListTests(TestCase):
    """Tests for the manager poll list endpoint with ordering."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000003',
            username='order-manager',
            full_name='مدیر ساختمان',
            national_id='1234567895',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.future_end = timezone.now() + timezone.timedelta(days=7)

        import time
        self.poll1 = Poll.objects.create(
            title='نظرسنجی قدیمی',
            description='توضیحات',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )
        time.sleep(0.01)
        self.poll2 = Poll.objects.create(
            title='نظرسنجی جدیدتر',
            description='توضیحات',
            status=PollStatus.ACTIVE,
            ends_at=self.future_end,
            created_by=self.manager,
        )
        time.sleep(0.01)
        self.poll3 = Poll.objects.create(
            title='نظرسنجی جدیدترین',
            description='توضیحات',
            status=PollStatus.CLOSED,
            ends_at=self.future_end,
            created_by=self.manager,
        )

    def login_as_manager(self):
        response = self.client.post(
            '/api/auth/login/',
            {'login': 'order-manager', 'password': 'Manager123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def test_polls_ordered_by_created_at_descending(self):
        """Test that polls are ordered by created_at descending by default."""
        self.login_as_manager()

        response = self.client.get('/api/manager/polls/')

        self.assertEqual(response.status_code, 200)
        polls = response.data['polls']
        self.assertEqual(len(polls), 3)

        self.assertEqual(polls[0]['id'], self.poll3.id)
        self.assertEqual(polls[1]['id'], self.poll2.id)
        self.assertEqual(polls[2]['id'], self.poll1.id)
