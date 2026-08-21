from buildings.models import Unit
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from polls.models import Poll, PollStatus, PollOption, Vote
from rest_framework.test import APIClient

User = get_user_model()


class PollCreationTests(TestCase):
    """Tests for creating polls via the manager API endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000000',
            username='poll-manager',
            full_name='مدیر ساختمان',
            national_id='1234567890',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            phone='09121111111',
            username='poll-resident',
            full_name='سارا احمدی',
            national_id='1234567891',
            password='Resident123',
            role='resident',
        )
        self.staff = User.objects.create_user(
            phone='09122222222',
            username='poll-staff',
            full_name='نیروی خدمات',
            national_id='1234567892',
            password='Service123',
            role='service_staff',
        )

        self.unit_a = Unit.objects.create(
            owner=self.resident,
            unit_number='101',
            floor=1,
            area='80.00',
        )
        self.unit_b = Unit.objects.create(
            owner=None,
            unit_number='102',
            floor=1,
            area='85.00',
        )

        self.future_end = timezone.now() + timezone.timedelta(days=7)

    def login_as_manager(self):
        response = self.client.post(
            '/api/auth/login/',
            {'login': 'poll-manager', 'password': 'Manager123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def test_manager_can_create_active_poll_with_options(self):
        """Simulates a Manager successfully creating an Active poll with two or more options.
        Asserts a 201 response and that created_by is that manager.
        """
        self.login_as_manager()

        starts_at = (timezone.now() + timezone.timedelta(hours=1)).isoformat()
        payload = {
            'title': 'نظرسنجی نمونه',
            'description': 'توضیحات نمونه',
            'status': 'Active',
            'starts_at': starts_at,
            'ends_at': self.future_end.isoformat(),
            'target_units': [self.unit_a.id],
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['message'], 'نظرسنجی با موفقیت ایجاد شد.')

        poll = Poll.objects.get()
        self.assertEqual(poll.title, 'نظرسنجی نمونه')
        self.assertEqual(poll.status, PollStatus.ACTIVE)
        self.assertEqual(poll.created_by, self.manager)
        self.assertEqual(poll.options.count(), 2)
        self.assertEqual(poll.target_units.count(), 1)
        self.assertEqual(poll.target_units.first(), self.unit_a)

        option_texts = list(poll.options.values_list('text', flat=True))
        self.assertEqual(option_texts, ['گزینه اول', 'گزینه دوم'])

    def test_poll_creation_fails_with_missing_title(self):
        """Validation test: missing title should return 400 and create no poll."""
        self.login_as_manager()

        payload = {
            'title': '   ',
            'description': 'توضیحات نمونه',
            'status': 'Draft',
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)
        self.assertEqual(Poll.objects.count(), 0)

    def test_poll_creation_fails_with_fewer_than_two_options(self):
        """Validation test: fewer than two options should return 400 and create no poll."""
        self.login_as_manager()

        payload = {
            'title': 'نظرسنجی نمونه',
            'description': 'توضیحات نمونه',
            'status': 'Draft',
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'تنها گزینه', 'position': 0},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('options', response.data)
        self.assertEqual(Poll.objects.count(), 0)

    def test_poll_creation_fails_with_duplicate_option_texts(self):
        """Validation test: duplicate option texts should return 400 and create no poll."""
        self.login_as_manager()

        payload = {
            'title': 'نظرسنجی نمونه',
            'description': 'توضیحات نمونه',
            'status': 'Draft',
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه تکراری', 'position': 0},
                {'text': 'گزینه تکراری', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('options', response.data)
        self.assertEqual(Poll.objects.count(), 0)

    def test_poll_creation_fails_with_ends_at_in_past_for_active_poll(self):
        """Validation test: ends_at in the past for an Active poll should return 400."""
        self.login_as_manager()

        past_end = (timezone.now() - timezone.timedelta(days=1)).isoformat()
        starts_at = (timezone.now() + timezone.timedelta(hours=1)).isoformat()

        payload = {
            'title': 'نظرسنجی نمونه',
            'description': 'توضیحات نمونه',
            'status': 'Active',
            'starts_at': starts_at,
            'ends_at': past_end,
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('ends_at', response.data)
        self.assertEqual(Poll.objects.count(), 0)

    def test_active_poll_requires_starts_at(self):
        """Validation test: Active poll without starts_at should return 400."""
        self.login_as_manager()

        payload = {
            'title': 'نظرسنجی نمونه',
            'description': 'توضیحات نمونه',
            'status': 'Active',
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        response = self.client.post('/api/manager/polls/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('starts_at', response.data)
        self.assertEqual(Poll.objects.count(), 0)


class PollStatusTransitionTests(TestCase):
    """Tests for publishing and closing polls."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000001',
            username='status-manager',
            full_name='مدیر ساختمان',
            national_id='1234567893',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.future_end = timezone.now() + timezone.timedelta(days=7)
        self.starts_at = (timezone.now() + timezone.timedelta(hours=1)).isoformat()

    def login_as_manager(self):
        response = self.client.post(
            '/api/auth/login/',
            {'login': 'status-manager', 'password': 'Manager123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def test_publish_draft_poll_as_active(self):
        """Test that a Draft poll can be published as Active."""
        self.login_as_manager()

        # Create a Draft poll with starts_at included
        create_payload = {
            'title': 'نظرسنجی پیش‌نویس',
            'description': 'توضیحات',
            'status': 'Draft',
            'starts_at': self.starts_at,  # Include starts_at even for Draft
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        create_response = self.client.post('/api/manager/polls/', create_payload, format='json')
        self.assertEqual(create_response.status_code, 201)
        poll_id = create_response.data['poll']['id']

        # Verify it's Draft
        poll = Poll.objects.get(pk=poll_id)
        self.assertEqual(poll.status, PollStatus.DRAFT)

        # Publish it as Active - need to send starts_at
        patch_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {
                'status': 'Active',
                'starts_at': self.starts_at,  # Must include starts_at
            },
            format='json',
        )

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data['message'], 'نظرسنجی با موفقیت منتشر شد.')

        poll.refresh_from_db()
        self.assertEqual(poll.status, PollStatus.ACTIVE)

    def test_close_active_poll(self):
        """Test that an Active poll can be closed."""
        self.login_as_manager()

        # Create an Active poll directly
        create_payload = {
            'title': 'نظرسنجی فعال',
            'description': 'توضیحات',
            'status': 'Active',
            'starts_at': self.starts_at,
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        create_response = self.client.post('/api/manager/polls/', create_payload, format='json')
        self.assertEqual(create_response.status_code, 201)
        poll_id = create_response.data['poll']['id']

        # Verify it's Active
        poll = Poll.objects.get(pk=poll_id)
        self.assertEqual(poll.status, PollStatus.ACTIVE)

        # Close it
        patch_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {'status': 'Closed'},
            format='json',
        )

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data['message'], 'نظرسنجی با موفقیت بسته شد.')

        poll.refresh_from_db()
        self.assertEqual(poll.status, PollStatus.CLOSED)

    def test_draft_poll_cannot_be_closed_directly(self):
        """Test that a Draft poll cannot be closed directly."""
        self.login_as_manager()

        # Create a Draft poll
        create_payload = {
            'title': 'نظرسنجی پیش‌نویس',
            'description': 'توضیحات',
            'status': 'Draft',
            'starts_at': self.starts_at,
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        create_response = self.client.post('/api/manager/polls/', create_payload, format='json')
        self.assertEqual(create_response.status_code, 201)
        poll_id = create_response.data['poll']['id']

        # Try to close it directly (should fail)
        patch_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {'status': 'Closed'},
            format='json',
        )

        self.assertEqual(patch_response.status_code, 400)
        poll = Poll.objects.get(pk=poll_id)
        self.assertEqual(poll.status, PollStatus.DRAFT)

    def test_draft_poll_can_be_edited(self):
        """Test that a Draft poll can be edited."""
        self.login_as_manager()

        # Create a Draft poll
        create_payload = {
            'title': 'نظرسنجی پیش‌نویس',
            'description': 'توضیحات',
            'status': 'Draft',
            'starts_at': self.starts_at,
            'ends_at': self.future_end.isoformat(),
            'options': [
                {'text': 'گزینه اول', 'position': 0},
                {'text': 'گزینه دوم', 'position': 1},
            ],
        }

        create_response = self.client.post('/api/manager/polls/', create_payload, format='json')
        self.assertEqual(create_response.status_code, 201)
        poll_id = create_response.data['poll']['id']

        # Edit the Draft
        patch_response = self.client.patch(
            f'/api/manager/polls/{poll_id}/',
            {
                'title': 'عنوان ویرایش شده',
                'description': 'توضیحات جدید',
            },
            format='json',
        )

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.data['message'], 'نظرسنجی با موفقیت به‌روزرسانی شد.')

        poll = Poll.objects.get(pk=poll_id)
        self.assertEqual(poll.title, 'عنوان ویرایش شده')
        self.assertEqual(poll.description, 'توضیحات جدید')
        self.assertEqual(poll.status, PollStatus.DRAFT)


class PollListDetailTests(TestCase):
    """Tests for listing and retrieving polls."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000002',
            username='list-manager',
            full_name='مدیر ساختمان',
            national_id='1234567894',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.future_end = timezone.now() + timezone.timedelta(days=7)

        self.poll1 = Poll.objects.create(
            title='نظرسنجی اول',
            description='توضیحات اول',
            status=PollStatus.ACTIVE,
            ends_at=self.future_end,
            created_by=self.manager,
        )
        self.poll2 = Poll.objects.create(
            title='نظرسنجی دوم',
            description='توضیحات دوم',
            status=PollStatus.DRAFT,
            ends_at=self.future_end,
            created_by=self.manager,
        )

    def login_as_manager(self):
        response = self.client.post(
            '/api/auth/login/',
            {'login': 'list-manager', 'password': 'Manager123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def test_manager_can_list_all_polls(self):
        """Test that GET /api/manager/polls/ returns all polls ordered by created_at desc."""
        self.login_as_manager()

        response = self.client.get('/api/manager/polls/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['polls']), 2)
        self.assertEqual(response.data['polls'][0]['id'], self.poll2.id)
        self.assertEqual(response.data['polls'][1]['id'], self.poll1.id)

    def test_manager_can_get_single_poll(self):
        """Test that GET /api/manager/polls/<id>/ returns a single poll."""
        self.login_as_manager()

        response = self.client.get(f'/api/manager/polls/{self.poll1.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['poll']['id'], self.poll1.id)
        self.assertEqual(response.data['poll']['title'], 'نظرسنجی اول')
        self.assertIn('options', response.data['poll'])

    def test_get_nonexistent_poll_returns_404(self):
        """Test that GET for a non-existent poll returns 404."""
        self.login_as_manager()

        response = self.client.get('/api/manager/polls/99999/')

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['detail'], 'نظرسنجی مورد نظر یافت نشد.')


class ResidentPollVotingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.manager = User.objects.create_user(
            phone="09120000000",
            username="poll-manager",
            full_name="مدیر ساختمان",
            national_id="1234567890",
            password="Manager123",
            role="manager",
        )

        self.user_a = User.objects.create_user(
            phone="09121111111",
            username="resident-a",
            full_name="سارا احمدی",
            national_id="1234567891",
            password="Resident123",
            role="resident",
        )

        self.user_b = User.objects.create_user(
            phone="09122222222",
            username="resident-b",
            full_name="علی رضایی",
            national_id="1234567892",
            password="Resident123",
            role="resident",
        )

        self.unit_a = Unit.objects.create(
            owner=self.user_a,
            unit_number="101",
            floor=1,
            area="80.00",
        )

        self.unit_b = Unit.objects.create(
            owner=self.user_b,
            unit_number="102",
            floor=1,
            area="85.00",
        )

        self.future_ends_at = timezone.now() + timezone.timedelta(days=7)

        self.poll = Poll.objects.create(
            title="نظرسنجی تست",
            description="توضیحات تست",
            status=PollStatus.ACTIVE,
            starts_at=timezone.now() - timezone.timedelta(hours=1),
            ends_at=self.future_ends_at,
            created_by=self.manager,
        )

        self.poll.target_units.add(self.unit_a)

        self.option_1 = PollOption.objects.create(
            poll=self.poll,
            text="گزینه اول",
            position=0,
        )

        self.option_2 = PollOption.objects.create(
            poll=self.poll,
            text="گزینه دوم",
            position=1,
        )

        self.poll_list_url = reverse("resident-polls")
        self.vote_url = reverse("resident-poll-vote", kwargs={"pk": self.poll.id})

    def test_resident_can_vote_for_active_targeted_poll(self):
        self.client.force_authenticate(user=self.user_a)

        payload = {"option_id": self.option_1.id}

        response = self.client.post(self.vote_url, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Vote.objects.filter(poll=self.poll, resident=self.user_a).count(), 1)

        vote = Vote.objects.get(poll=self.poll, resident=self.user_a)
        self.assertEqual(vote.option, self.option_1)

    def test_resident_cannot_vote_twice_on_same_poll(self):
        self.client.force_authenticate(user=self.user_a)

        payload = {"option_id": self.option_1.id}

        first_response = self.client.post(self.vote_url, payload, format="json")
        self.assertEqual(first_response.status_code, 201)

        original_vote = Vote.objects.get(poll=self.poll, resident=self.user_a)

        payload = {"option_id": self.option_2.id}

        second_response = self.client.post(self.vote_url, payload, format="json")

        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(Vote.objects.filter(poll=self.poll, resident=self.user_a).count(), 1)

        original_vote.refresh_from_db()
        self.assertEqual(original_vote.option, self.option_1)

    def test_resident_cannot_vote_on_inactive_poll(self):
        for status in [PollStatus.DRAFT, PollStatus.CLOSED]:
            self.poll.status = status
            self.poll.save(update_fields=["status"])

            self.client.force_authenticate(user=self.user_a)

            payload = {"option_id": self.option_1.id}

            response = self.client.post(self.vote_url, payload, format="json")

            self.assertEqual(response.status_code, 400)
            self.assertEqual(Vote.objects.filter(poll=self.poll).count(), 0)

    def test_resident_cannot_vote_on_expired_poll(self):
        self.poll.ends_at = timezone.now() - timezone.timedelta(minutes=1)
        self.poll.save(update_fields=["ends_at"])

        self.client.force_authenticate(user=self.user_a)

        payload = {"option_id": self.option_1.id}

        response = self.client.post(self.vote_url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Vote.objects.filter(poll=self.poll).count(), 0)

    def test_resident_cannot_vote_on_poll_not_targeting_their_unit(self):
        self.poll.target_units.clear()
        self.poll.target_units.add(self.unit_b)

        self.client.force_authenticate(user=self.user_a)

        payload = {"option_id": self.option_1.id}

        response = self.client.post(self.vote_url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Vote.objects.filter(poll=self.poll, resident=self.user_a).count(), 0)

    def test_resident_poll_list_does_not_expose_other_residents_votes(self):
        Vote.objects.create(
            poll=self.poll,
            option=self.option_2,
            resident=self.user_b,
        )

        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(self.poll_list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["polls"]), 1)

        poll_data = response.data["polls"][0]

        self.assertEqual(poll_data["id"], self.poll.id)
        self.assertFalse(poll_data["has_voted"])
        self.assertIsNone(poll_data["selected_option_id"])


class PollDeletionTests(TestCase):
    """Tests for discarding a Draft poll via the manager API endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            phone='09120000002',
            username='delete-manager',
            full_name='مدیر ساختمان',
            national_id='1234567894',
            password='Manager123',
            role='manager',
            is_staff=True,
        )
        self.future_end = timezone.now() + timezone.timedelta(days=7)
        self.starts_at = timezone.now() + timezone.timedelta(hours=1)

    def login_as_manager(self):
        response = self.client.post(
            '/api/auth/login/',
            {'login': 'delete-manager', 'password': 'Manager123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.client.cookies = response.cookies

    def create_poll(self, status=PollStatus.DRAFT):
        poll = Poll.objects.create(
            title='نظرسنجی تست حذف',
            description='توضیحات',
            status=status,
            starts_at=self.starts_at,
            ends_at=self.future_end,
            created_by=self.manager,
        )
        PollOption.objects.create(poll=poll, text='گزینه اول', position=0)
        PollOption.objects.create(poll=poll, text='گزینه دوم', position=1)
        return poll

    def test_manager_can_delete_draft_poll(self):
        """A Draft poll was never visible to residents, so it can be discarded."""
        self.login_as_manager()
        poll = self.create_poll(status=PollStatus.DRAFT)

        response = self.client.delete(f'/api/manager/polls/{poll.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['message'], 'نظرسنجی با موفقیت حذف شد.')
        self.assertFalse(Poll.objects.filter(pk=poll.id).exists())

    def test_deleting_a_draft_removes_its_options(self):
        """The options belong to the poll and must not outlive it."""
        self.login_as_manager()
        poll = self.create_poll(status=PollStatus.DRAFT)

        self.client.delete(f'/api/manager/polls/{poll.id}/')

        self.assertEqual(PollOption.objects.filter(poll_id=poll.id).count(), 0)

    def test_active_poll_cannot_be_deleted(self):
        """An Active poll may already hold votes; it is closed rather than deleted."""
        self.login_as_manager()
        poll = self.create_poll(status=PollStatus.ACTIVE)

        response = self.client.delete(f'/api/manager/polls/{poll.id}/')

        self.assertEqual(response.status_code, 400)
        self.assertIn('پیش‌نویس', response.data['detail'])
        self.assertTrue(Poll.objects.filter(pk=poll.id).exists())

    def test_closed_poll_cannot_be_deleted(self):
        """A Closed poll is the record of a building decision and is kept."""
        self.login_as_manager()
        poll = self.create_poll(status=PollStatus.CLOSED)

        response = self.client.delete(f'/api/manager/polls/{poll.id}/')

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Poll.objects.filter(pk=poll.id).exists())

    def test_deleting_a_missing_poll_returns_404(self):
        self.login_as_manager()

        response = self.client.delete('/api/manager/polls/999999/')

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['detail'], 'نظرسنجی مورد نظر یافت نشد.')
