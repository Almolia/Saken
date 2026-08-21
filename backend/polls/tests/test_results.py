from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from buildings.models import Unit
from polls.models import Poll, PollOption, PollStatus, Vote

User = get_user_model()


class PollResultsAPITests(APITestCase):
    def setUp(self):
        # 1. Setup Users
        self.manager = User.objects.create_user(phone='09120000001', full_name='Manager', national_id='100',
                                                role='manager')
        self.staff = User.objects.create_user(phone='09120000002', full_name='Staff', national_id='200',
                                              role='service_staff')

        self.resident_voted = User.objects.create_user(phone='09120000003', full_name='Resident Voted',
                                                       national_id='300', role='resident')
        self.resident_pending = User.objects.create_user(phone='09120000004', full_name='Resident Pending',
                                                         national_id='400', role='resident')
        self.resident_outsider = User.objects.create_user(phone='09120000005', full_name='Resident Outsider',
                                                          national_id='500', role='resident')

        # 2. Setup Units
        self.unit_voted = Unit.objects.create(unit_number='101', floor=1, area=100, owner=self.resident_voted)
        self.unit_pending = Unit.objects.create(unit_number='102', floor=1, area=100, owner=self.resident_pending)
        self.unit_outsider = Unit.objects.create(unit_number='201', floor=2, area=100, owner=self.resident_outsider)

        # 3. Setup Polls & Options
        self.active_poll = Poll.objects.create(
            title='Color Poll',
            status=PollStatus.ACTIVE,
            ends_at=timezone.now() + timedelta(days=2),
            created_by=self.manager
        )
        self.active_poll.target_units.set([self.unit_voted, self.unit_pending])

        self.opt_a = PollOption.objects.create(poll=self.active_poll, text='Blue', position=1)
        self.opt_b = PollOption.objects.create(poll=self.active_poll, text='Red', position=2)

        # Cast a single vote
        Vote.objects.create(poll=self.active_poll, option=self.opt_a, resident=self.resident_voted)

        # URLs
        self.manager_url = reverse('manager-poll-results', kwargs={'pk': self.active_poll.pk})
        self.resident_url = reverse('resident-poll-results', kwargs={'pk': self.active_poll.pk})

    def test_manager_can_read_results_and_math_is_correct(self):
        """Asserts correct counts and percentages are returned, with no voter IDs."""
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.manager_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_votes'], 1)

        options = response.data['options']
        blue_option = next(o for o in options if o['text'] == 'Blue')
        red_option = next(o for o in options if o['text'] == 'Red')

        self.assertEqual(blue_option['vote_count'], 1)
        self.assertEqual(blue_option['percentage'], 100.0)
        self.assertEqual(red_option['vote_count'], 0)
        self.assertEqual(red_option['percentage'], 0.0)

        # Check anonymity
        payload_string = str(response.data)
        self.assertNotIn('Resident Voted', payload_string)
        self.assertNotIn('resident_id', payload_string)

    def test_resident_cannot_read_results_if_open_and_not_voted(self):
        """Asserts 403 if poll is active and resident hasn't voted."""
        self.client.force_authenticate(user=self.resident_pending)
        response = self.client.get(self.resident_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('نتایج نظرسنجی پس از ثبت رأی', response.data['detail'])

    def test_resident_can_read_results_after_voting(self):
        """Asserts resident gets 200 OK after casting their vote."""
        self.client.force_authenticate(user=self.resident_voted)
        response = self.client.get(self.resident_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_resident_can_read_results_after_poll_closes(self):
        """Asserts resident who hasn't voted can see results if poll is CLOSED."""
        self.active_poll.status = PollStatus.CLOSED
        self.active_poll.save()

        self.client.force_authenticate(user=self.resident_pending)
        response = self.client.get(self.resident_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_resident_cannot_read_results_for_non_targeted_unit(self):
        """Asserts outsider resident gets 403 on targeted polls."""
        self.client.force_authenticate(user=self.resident_outsider)
        response = self.client.get(self.resident_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('شما مجاز به مشاهده این نظرسنجی نیستید', response.data['detail'])

    def test_service_staff_is_forbidden(self):
        """Asserts Service Staff cannot access either endpoint."""
        self.client.force_authenticate(user=self.staff)

        self.assertEqual(self.client.get(self.manager_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(self.resident_url).status_code, status.HTTP_403_FORBIDDEN)