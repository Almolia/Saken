from datetime import datetime, timedelta

from amenities.models import Amenity, Reservation, ReservationStatus
from amenities.services import check_booking_conflict
from common.constants import AmenityMessages
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

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


class ReservationModelTests(APITestCase):
    """Tests for the Reservation model."""

    def setUp(self):
        self.resident = User.objects.create_user(
            phone="09121112233",
            password="ResidentPass123",
            full_name="Test Resident",
            national_id="1122334455",
            role="resident",
        )
        self.amenity = Amenity.objects.create(name="باشگاه", operating_rules="08:00 تا 22:00")

    def test_create_reservation_model(self):
        start_time = timezone.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=1)

        res = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident,
            start_time=start_time,
            end_time=end_time,
        )
        self.assertEqual(res.status, ReservationStatus.ACTIVE)
        self.assertEqual(res.amenity, self.amenity)
        self.assertEqual(res.resident, self.resident)
        self.assertIn(self.amenity.name, str(res))


class ConflictResolutionServiceTests(APITestCase):
    """Tests for check_booking_conflict service function."""

    def setUp(self):
        self.resident1 = User.objects.create_user(
            phone="09123334455",
            password="Resident1Pass",
            full_name="Resident One",
            national_id="3333333333",
            role="resident",
        )
        self.resident2 = User.objects.create_user(
            phone="09124445566",
            password="Resident2Pass",
            full_name="Resident Two",
            national_id="4444444444",
            role="resident",
        )
        self.amenity = Amenity.objects.create(name="زمین تنیس", is_active=True)
        self.base_time = timezone.localtime(timezone.now()).replace(hour=10, minute=0, second=0,
                                                                    microsecond=0) + timedelta(days=2)

    def test_no_conflict_when_empty(self):
        # Should not raise any exception
        check_booking_conflict(
            self.amenity.id,
            self.base_time,
            self.base_time + timedelta(hours=1),
        )

    def test_overlap_raises_validation_error(self):
        # Create an existing active booking from 10:00 to 11:00
        Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident1,
            start_time=self.base_time,
            end_time=self.base_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        # Overlapping request from 10:30 to 11:30 should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            check_booking_conflict(
                self.amenity.id,
                self.base_time + timedelta(minutes=30),
                self.base_time + timedelta(hours=1, minutes=30),
            )
        self.assertIn(AmenityMessages.SLOT_ALREADY_BOOKED, str(context.exception))

    def test_adjacent_time_no_conflict(self):
        # Booking from 10:00 to 11:00
        Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident1,
            start_time=self.base_time,
            end_time=self.base_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        # Request from 11:00 to 12:00 is adjacent, not overlapping
        check_booking_conflict(
            self.amenity.id,
            self.base_time + timedelta(hours=1),
            self.base_time + timedelta(hours=2),
        )

    def test_canceled_reservation_no_conflict(self):
        # Canceled booking from 10:00 to 11:00
        Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident1,
            start_time=self.base_time,
            end_time=self.base_time + timedelta(hours=1),
            status=ReservationStatus.CANCELED,
        )

        # Should pass without conflict
        check_booking_conflict(
            self.amenity.id,
            self.base_time,
            self.base_time + timedelta(hours=1),
        )


class ResidentReservationAPITests(APITestCase):
    """Tests for POST and GET /api/resident/reservations/."""

    def setUp(self):
        self.resident = User.objects.create_user(
            phone="09125556677",
            password="ResidentPass",
            full_name="Alice Resident",
            national_id="5555555555",
            role="resident",
        )
        self.other_resident = User.objects.create_user(
            phone="09126667788",
            password="ResidentPass",
            full_name="Bob Resident",
            national_id="6666666666",
            role="resident",
        )
        self.manager = User.objects.create_user(
            phone="09127778899",
            password="ManagerPass",
            full_name="Charlie Manager",
            national_id="7777777777",
            role="manager",
        )
        self.amenity = Amenity.objects.create(name="باشگاه", operating_rules="08:00 تا 22:00", is_active=True)
        self.list_url = reverse("resident-reservations")
        self.base_time = timezone.localtime(timezone.now()).replace(hour=14, minute=0, second=0,
                                                                    microsecond=0) + timedelta(days=3)

    def test_resident_can_create_reservation(self):
        self.client.force_authenticate(user=self.resident)
        payload = {
            "amenity": self.amenity.id,
            "start_time": self.base_time.isoformat(),
            "end_time": (self.base_time + timedelta(hours=1)).isoformat(),
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], AmenityMessages.RESERVATION_CREATED)
        self.assertEqual(response.data["reservation"]["amenity"], self.amenity.id)
        self.assertEqual(response.data["reservation"]["resident"], self.resident.id)
        self.assertEqual(Reservation.objects.count(), 1)
        res = Reservation.objects.first()
        self.assertEqual(res.resident, self.resident)

    def test_past_start_time_returns_400_with_persian_message(self):
        self.client.force_authenticate(user=self.resident)
        start_time = timezone.now() - timedelta(hours=2)
        response = self.client.post(
            self.list_url,
            {
                "amenity": self.amenity.id,
                "start_time": start_time.isoformat(),
                "end_time": (start_time + timedelta(hours=1)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(AmenityMessages.PAST_RESERVATION_NOT_ALLOWED, str(response.data))
        self.assertFalse(Reservation.objects.exists())

    def test_conflict_returns_400(self):
        # Existing reservation
        Reservation.objects.create(
            amenity=self.amenity,
            resident=self.other_resident,
            start_time=self.base_time,
            end_time=self.base_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        self.client.force_authenticate(user=self.resident)
        payload = {
            "amenity": self.amenity.id,
            "start_time": self.base_time.isoformat(),
            "end_time": (self.base_time + timedelta(hours=1)).isoformat(),
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_cannot_create_via_resident_endpoint(self):
        self.client.force_authenticate(user=self.manager)
        payload = {
            "amenity": self.amenity.id,
            "start_time": self.base_time.isoformat(),
            "end_time": (self.base_time + timedelta(hours=1)).isoformat(),
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AmenitySlotsAPITests(APITestCase):
    """Tests for GET /api/amenities/<id>/slots/?date=YYYY-MM-DD."""

    def setUp(self):
        self.resident = User.objects.create_user(
            phone="09128889900",
            password="ResidentPass",
            full_name="Slot Resident",
            national_id="8888888888",
            role="resident",
        )
        self.amenity = Amenity.objects.create(name="لابی", is_active=True)
        self.target_date = timezone.localtime(timezone.now()).date() + timedelta(days=5)
        self.base_time = timezone.make_aware(datetime.combine(self.target_date, datetime.min.time())).replace(hour=10,
                                                                                                              minute=0,
                                                                                                              second=0,
                                                                                                              microsecond=0)

    def test_get_slots(self):
        self.client.force_authenticate(user=self.resident)
        # Create an active reservation from 10:00 to 11:00
        Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident,
            start_time=self.base_time,
            end_time=self.base_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )
        url = reverse("amenity-slots", kwargs={"pk": self.amenity.id})
        response = self.client.get(f"{url}?date={self.target_date.isoformat()}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["date"], self.target_date.isoformat())
        self.assertEqual(len(response.data["reservations"]), 1)
        self.assertEqual(len(response.data["slots"]), 14)

        # Slot at 10:00 (index 2 for 08:00, 09:00, 10:00) should be booked
        slot_10 = next(s for s in response.data["slots"] if s["start_time_formatted"] == "10:00")
        self.assertTrue(slot_10["is_booked"])
        self.assertFalse(slot_10["is_available"])

        slot_11 = next(s for s in response.data["slots"] if s["start_time_formatted"] == "11:00")
        self.assertFalse(slot_11["is_booked"])
        self.assertTrue(slot_11["is_available"])

    def test_past_slots_are_disabled_by_backend(self):
        self.client.force_authenticate(user=self.resident)
        past_date = timezone.localdate() - timedelta(days=1)
        url = reverse("amenity-slots", kwargs={"pk": self.amenity.id})

        response = self.client.get(f"{url}?date={past_date.isoformat()}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(slot["is_past"] for slot in response.data["slots"]))
        self.assertTrue(all(slot["disabled"] for slot in response.data["slots"]))
        self.assertTrue(all(slot["is_booked"] for slot in response.data["slots"]))
        self.assertTrue(all(not slot["is_available"] for slot in response.data["slots"]))


class DoubleBookingAndLogicTests(APITestCase):
    """
    Task 6: Double-Booking & Logic Tests
    - Simulate Resident A successfully booking the Pool from 10:00 to 12:00.
    - Simulate Resident B attempting to book the Pool from 11:00 to 13:00 (partial overlap)
      or 10:00 to 12:00 (exact overlap) -> Assert 400 Validation Error.
    - Verify that a Resident cannot book an amenity that has is_active = False (under maintenance).
    """

    def setUp(self):
        self.resident_a = User.objects.create_user(
            phone="09120000001",
            password="ResidentPassA",
            full_name="Resident A",
            national_id="0000000001",
            role="resident",
        )
        self.resident_b = User.objects.create_user(
            phone="09120000002",
            password="ResidentPassB",
            full_name="Resident B",
            national_id="0000000002",
            role="resident",
        )
        self.pool = Amenity.objects.create(
            name="استخر",
            description="استخر شنا",
            operating_rules="08:00 تا 22:00",
            is_active=True,
        )
        self.list_url = reverse("resident-reservations")
        self.base_time = timezone.localtime(timezone.now()).replace(
            hour=10, minute=0, second=0, microsecond=0
        ) + timedelta(days=10)

    def test_resident_a_books_pool_10_to_12_success(self):
        self.client.force_authenticate(user=self.resident_a)
        payload = {
            "amenity": self.pool.id,
            "start_time": self.base_time.isoformat(),
            "end_time": (self.base_time + timedelta(hours=2)).isoformat(),
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], AmenityMessages.RESERVATION_CREATED)
        self.assertEqual(Reservation.objects.count(), 1)
        res = Reservation.objects.first()
        self.assertEqual(res.resident, self.resident_a)
        self.assertEqual(res.amenity.name, "استخر")

    def test_resident_b_booking_pool_partial_or_exact_overlap_returns_400(self):
        # Resident A books Pool from 10:00 to 12:00
        Reservation.objects.create(
            amenity=self.pool,
            resident=self.resident_a,
            start_time=self.base_time,
            end_time=self.base_time + timedelta(hours=2),
            status=ReservationStatus.ACTIVE,
        )

        self.client.force_authenticate(user=self.resident_b)

        # 1. Partial overlap: 11:00 to 13:00
        payload_partial = {
            "amenity": self.pool.id,
            "start_time": (self.base_time + timedelta(hours=1)).isoformat(),
            "end_time": (self.base_time + timedelta(hours=3)).isoformat(),
        }
        response_partial = self.client.post(self.list_url, payload_partial, format="json")
        self.assertEqual(response_partial.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("این بازه زمانی قبلاً رزرو شده است", str(response_partial.data))

        # 2. Exact overlap: 10:00 to 12:00
        payload_exact = {
            "amenity": self.pool.id,
            "start_time": self.base_time.isoformat(),
            "end_time": (self.base_time + timedelta(hours=2)).isoformat(),
        }
        response_exact = self.client.post(self.list_url, payload_exact, format="json")
        self.assertEqual(response_exact.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("این بازه زمانی قبلاً رزرو شده است", str(response_exact.data))

        # 3. Partial overlap before: 09:00 to 11:00
        payload_before = {
            "amenity": self.pool.id,
            "start_time": (self.base_time - timedelta(hours=1)).isoformat(),
            "end_time": (self.base_time + timedelta(hours=1)).isoformat(),
        }
        response_before = self.client.post(self.list_url, payload_before, format="json")
        self.assertEqual(response_before.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resident_cannot_book_inactive_amenity_under_maintenance(self):
        self.pool.is_active = False
        self.pool.save(update_fields=["is_active"])

        self.client.force_authenticate(user=self.resident_a)
        payload = {
            "amenity": self.pool.id,
            "start_time": self.base_time.isoformat(),
            "end_time": (self.base_time + timedelta(hours=2)).isoformat(),
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("فعال نیست", str(response.data))


class ResidentReservationIsolationAndCancellationTests(APITestCase):
    def setUp(self):
        self.resident_a = User.objects.create_user(
            phone="09120000101",
            password="ResidentPassA",
            full_name="Resident A",
            national_id="0000000101",
            role="resident",
        )
        self.resident_b = User.objects.create_user(
            phone="09120000102",
            password="ResidentPassB",
            full_name="Resident B",
            national_id="0000000102",
            role="resident",
        )
        self.amenity = Amenity.objects.create(
            name="سالن اجتماعات",
            description="سالن جلسات و مراسم",
            operating_rules="08:00 تا 22:00",
            is_active=True,
        )
        self.reservations_url = reverse("resident-reservations")

        # Future time for upcoming reservations (3 days from now)
        self.future_time = timezone.localtime(timezone.now()).replace(
            hour=10, minute=0, second=0, microsecond=0
        ) + timedelta(days=3)

        # Past time for past reservations (3 days ago)
        self.past_time = timezone.localtime(timezone.now()).replace(
            hour=10, minute=0, second=0, microsecond=0
        ) - timedelta(days=3)

    def test_data_isolation_resident_a_only_sees_own_bookings(self):
        """
        Test 1: Data isolation test - Resident A fetching their bookings,
        asserting that none of Resident B's bookings are returned.
        """
        # Create a future booking for Resident A
        reservation_a = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=self.future_time,
            end_time=self.future_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        # Create a future booking for Resident B
        reservation_b = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_b,
            start_time=self.future_time + timedelta(days=1),
            end_time=self.future_time + timedelta(days=1, hours=1),
            status=ReservationStatus.ACTIVE,
        )

        # Authenticate as Resident A and fetch bookings
        self.client.force_authenticate(user=self.resident_a)
        response = self.client.get(self.reservations_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservations = response.data["reservations"]

        # Should only see Resident A's reservation
        self.assertEqual(len(reservations), 1)
        self.assertEqual(reservations[0]["id"], reservation_a.id)
        self.assertEqual(reservations[0]["resident"], self.resident_a.id)

        # Explicitly verify Resident B's booking is NOT in the response
        resident_b_ids = [res["id"] for res in reservations if res["resident"] == self.resident_b.id]
        self.assertEqual(len(resident_b_ids), 0)

        # Verify the response includes the amenity name
        self.assertEqual(reservations[0]["amenity_name"], "سالن اجتماعات")

        # Verify ordering: upcoming first
        # Create another future booking for Resident A that is earlier
        earlier_time = self.future_time - timedelta(hours=2)
        Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=earlier_time,
            end_time=earlier_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        response = self.client.get(self.reservations_url)
        reservations = response.data["reservations"]

        # Should be ordered by start_time (earliest first)
        self.assertEqual(len(reservations), 2)
        self.assertEqual(reservations[0]["start_time"], earlier_time.isoformat())
        self.assertEqual(reservations[1]["start_time"], self.future_time.isoformat())

    def test_cancel_future_booking_then_another_user_can_book(self):
        """
        Test 2: Logic test - Cancelling a future booking.
        Assert a 200 OK, then verify another user can successfully book that exact same time slot.
        """
        # Resident A books the amenity for a future time
        self.client.force_authenticate(user=self.resident_a)
        create_payload = {
            "amenity": self.amenity.id,
            "start_time": self.future_time.isoformat(),
            "end_time": (self.future_time + timedelta(hours=1)).isoformat(),
        }
        create_response = self.client.post(self.reservations_url, create_payload, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        reservation_id = create_response.data["reservation"]["id"]

        # Verify the reservation exists and is active
        reservation = Reservation.objects.get(pk=reservation_id)
        self.assertEqual(reservation.status, ReservationStatus.ACTIVE)

        # Cancel the reservation using PATCH
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": reservation_id})
        patch_payload = {"status": ReservationStatus.CANCELED}
        patch_response = self.client.patch(detail_url, patch_payload, format="json")

        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["message"], AmenityMessages.RESERVATION_CANCELED)

        # Verify the reservation is now canceled
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.CANCELED)

        # Now Resident B should be able to book the exact same time slot
        self.client.force_authenticate(user=self.resident_b)
        book_payload = {
            "amenity": self.amenity.id,
            "start_time": self.future_time.isoformat(),
            "end_time": (self.future_time + timedelta(hours=1)).isoformat(),
        }
        book_response = self.client.post(self.reservations_url, book_payload, format="json")

        self.assertEqual(book_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(book_response.data["message"], AmenityMessages.RESERVATION_CREATED)

        # Verify Resident B's booking is active
        new_reservation = Reservation.objects.get(pk=book_response.data["reservation"]["id"])
        self.assertEqual(new_reservation.status, ReservationStatus.ACTIVE)
        self.assertEqual(new_reservation.resident, self.resident_b)
        self.assertEqual(new_reservation.start_time, self.future_time)

    def test_cancel_past_reservation_returns_400(self):
        """
        Test 3: Validation test - Attempting to cancel a past reservation.
        Asserts the system blocks it and returns a 400 error.
        """
        # Create a past reservation for Resident A
        past_reservation = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=self.past_time,
            end_time=self.past_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        self.client.force_authenticate(user=self.resident_a)
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": past_reservation.id})

        # Attempt to cancel the past reservation
        patch_payload = {"status": ReservationStatus.CANCELED}
        response = self.client.patch(detail_url, patch_payload, format="json")

        # Should be rejected with 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("امکان لغو رزروهای گذشته وجود ندارد", str(response.data))

        # Verify the reservation is still ACTIVE
        past_reservation.refresh_from_db()
        self.assertEqual(past_reservation.status, ReservationStatus.ACTIVE)

    def test_resident_cannot_cancel_another_residents_reservation(self):
        """
        Additional test: A resident cannot cancel another resident's reservation.
        """
        # Resident A creates a reservation
        self.client.force_authenticate(user=self.resident_a)
        create_payload = {
            "amenity": self.amenity.id,
            "start_time": self.future_time.isoformat(),
            "end_time": (self.future_time + timedelta(hours=1)).isoformat(),
        }
        create_response = self.client.post(self.reservations_url, create_payload, format="json")
        reservation_id = create_response.data["reservation"]["id"]

        # Resident B tries to cancel it
        self.client.force_authenticate(user=self.resident_b)
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": reservation_id})
        patch_payload = {"status": ReservationStatus.CANCELED}
        response = self.client.patch(detail_url, patch_payload, format="json")

        # Should return 404 since Resident B doesn't own it
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Verify the reservation is still ACTIVE
        reservation = Reservation.objects.get(pk=reservation_id)
        self.assertEqual(reservation.status, ReservationStatus.ACTIVE)

    def test_cancel_already_canceled_reservation_returns_error(self):
        """
        Additional test: Attempting to cancel an already canceled reservation.
        """
        # Create a future reservation
        self.client.force_authenticate(user=self.resident_a)
        create_payload = {
            "amenity": self.amenity.id,
            "start_time": self.future_time.isoformat(),
            "end_time": (self.future_time + timedelta(hours=1)).isoformat(),
        }
        create_response = self.client.post(self.reservations_url, create_payload, format="json")
        reservation_id = create_response.data["reservation"]["id"]

        # Cancel it once
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": reservation_id})
        patch_payload = {"status": ReservationStatus.CANCELED}
        first_response = self.client.patch(detail_url, patch_payload, format="json")
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)

        # Try to cancel it again
        second_response = self.client.patch(detail_url, patch_payload, format="json")
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("قبلاً لغو شده است", str(second_response.data))

    def test_reservation_list_ordered_by_start_time(self):
        """
        Additional test: Verify reservations are ordered by start_time (upcoming first).
        """
        # Create multiple reservations for Resident A with different times
        times = [
            self.future_time + timedelta(hours=3),  # Latest
            self.future_time,  # Earliest
            self.future_time + timedelta(hours=1),  # Middle
        ]

        for t in times:
            Reservation.objects.create(
                amenity=self.amenity,
                resident=self.resident_a,
                start_time=t,
                end_time=t + timedelta(hours=1),
                status=ReservationStatus.ACTIVE,
            )

        self.client.force_authenticate(user=self.resident_a)
        response = self.client.get(self.reservations_url)

        reservations = response.data["reservations"]
        self.assertEqual(len(reservations), 3)

        # Should be ordered by start_time (earliest first)
        start_times = [res["start_time"] for res in reservations]
        sorted_times = sorted([t.isoformat() for t in times])
        self.assertEqual(start_times, sorted_times)

    def test_canceled_reservations_do_not_block_availability(self):
        """
        Additional test: Canceled reservations are ignored in availability checks.
        """
        # Create a canceled reservation for a time slot
        canceled_reservation = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=self.future_time,
            end_time=self.future_time + timedelta(hours=1),
            status=ReservationStatus.CANCELED,
        )

        # Another resident should be able to book that slot
        self.client.force_authenticate(user=self.resident_b)
        book_payload = {
            "amenity": self.amenity.id,
            "start_time": self.future_time.isoformat(),
            "end_time": (self.future_time + timedelta(hours=1)).isoformat(),
        }
        response = self.client.post(self.reservations_url, book_payload, format="json")

        # Should succeed (201 Created) because canceled reservations don't block
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the new booking is active
        new_reservation = Reservation.objects.get(pk=response.data["reservation"]["id"])
        self.assertEqual(new_reservation.status, ReservationStatus.ACTIVE)
        self.assertEqual(new_reservation.resident, self.resident_b)

    def test_retrieve_own_reservation_detail(self):
        """
        The detail endpoint returns the reservation, including the fields the
        dashboard renders (amenity name, times and status).
        """
        reservation = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=self.future_time,
            end_time=self.future_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        self.client.force_authenticate(user=self.resident_a)
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": reservation.id})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reservation"]["id"], reservation.id)
        self.assertEqual(response.data["reservation"]["amenity_name"], self.amenity.name)
        self.assertEqual(response.data["reservation"]["status"], ReservationStatus.ACTIVE)

    def test_retrieve_another_residents_reservation_returns_404(self):
        """A resident cannot read another resident's reservation."""
        reservation = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=self.future_time,
            end_time=self.future_time + timedelta(hours=1),
            status=ReservationStatus.ACTIVE,
        )

        self.client.force_authenticate(user=self.resident_b)
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": reservation.id})
        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_rejects_a_status_other_than_canceled(self):
        """The PATCH endpoint only accepts a cancellation, not arbitrary edits."""
        reservation = Reservation.objects.create(
            amenity=self.amenity,
            resident=self.resident_a,
            start_time=self.future_time,
            end_time=self.future_time + timedelta(hours=1),
            status=ReservationStatus.CANCELED,
        )

        self.client.force_authenticate(user=self.resident_a)
        detail_url = reverse("resident-reservation-detail", kwargs={"pk": reservation.id})
        response = self.client.patch(detail_url, {"status": ReservationStatus.ACTIVE}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.CANCELED)


class ReservationCancelParityTests(APITestCase):
    """DELETE and PATCH must enforce identical cancellation rules.

    Before the fix, DELETE used a plain cancel that skipped the "must be
    future" and "not already cancelled" checks PATCH enforced, so the same
    booking could be cancelled through one endpoint but not the other.
    All paths now share the single cancel_reservation service.
    """

    def setUp(self):
        self.resident = User.objects.create_user(
            phone="09120000401",
            password="ResidentPass",
            full_name="Resident Parity",
            national_id="0000000401",
            role="resident",
        )
        self.other_resident = User.objects.create_user(
            phone="09120000402",
            password="ResidentPass",
            full_name="Other Resident",
            national_id="0000000402",
            role="resident",
        )
        self.amenity = Amenity.objects.create(name="سالن بیلیارد", is_active=True)

        now = timezone.localtime(timezone.now()).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        self.future_time = now + timedelta(days=4)
        self.past_time = now - timedelta(days=4)

    def make_reservation(self, start_time, resident=None, status_value=ReservationStatus.ACTIVE):
        return Reservation.objects.create(
            amenity=self.amenity,
            resident=resident or self.resident,
            start_time=start_time,
            end_time=start_time + timedelta(hours=1),
            status=status_value,
        )

    def patch_cancel(self, reservation):
        url = reverse("resident-reservation-detail", kwargs={"pk": reservation.id})
        return self.client.patch(url, {"status": ReservationStatus.CANCELED}, format="json")

    def delete_cancel(self, reservation):
        url = reverse("resident-reservation-detail", kwargs={"pk": reservation.id})
        return self.client.delete(url)

    # --- 2 states x 2 methods: identical status + message ----------------

    def test_past_reservation_is_rejected_identically_on_patch_and_delete(self):
        self.client.force_authenticate(user=self.resident)
        reservation = self.make_reservation(self.past_time)

        patch_response = self.patch_cancel(reservation)
        delete_response = self.delete_cancel(reservation)

        self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(patch_response.data, delete_response.data)
        self.assertEqual(
            patch_response.data["detail"],
            AmenityMessages.PAST_RESERVATION_NOT_CANCELLABLE,
        )

        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.ACTIVE)

    def test_already_canceled_reservation_is_rejected_identically_on_patch_and_delete(self):
        self.client.force_authenticate(user=self.resident)
        reservation = self.make_reservation(
            self.future_time, status_value=ReservationStatus.CANCELED
        )

        patch_response = self.patch_cancel(reservation)
        delete_response = self.delete_cancel(reservation)

        self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(patch_response.data, delete_response.data)
        self.assertEqual(
            patch_response.data["detail"],
            AmenityMessages.RESERVATION_ALREADY_CANCELED,
        )

    # --- happy path on both methods --------------------------------------

    def test_future_reservation_cancels_on_patch(self):
        self.client.force_authenticate(user=self.resident)
        reservation = self.make_reservation(self.future_time)

        response = self.patch_cancel(reservation)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], AmenityMessages.RESERVATION_CANCELED)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.CANCELED)

    def test_future_reservation_cancels_on_delete(self):
        self.client.force_authenticate(user=self.resident)
        reservation = self.make_reservation(self.future_time)

        response = self.delete_cancel(reservation)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], AmenityMessages.RESERVATION_CANCELED)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.CANCELED)

    # --- shared guard behaviour ------------------------------------------

    def test_delete_rejects_another_residents_reservation_like_patch(self):
        reservation = self.make_reservation(self.future_time, resident=self.other_resident)
        self.client.force_authenticate(user=self.resident)

        patch_response = self.patch_cancel(reservation)
        delete_response = self.delete_cancel(reservation)

        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)

        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.ACTIVE)

    def test_delete_on_a_missing_reservation_returns_404(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.delete(
            reverse("resident-reservation-detail", kwargs={"pk": 999999})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], AmenityMessages.RESERVATION_NOT_FOUND)

    def test_post_cancel_endpoint_uses_the_same_rules(self):
        self.client.force_authenticate(user=self.resident)
        past_reservation = self.make_reservation(self.past_time)
        url = reverse("resident-reservation-cancel", kwargs={"pk": past_reservation.id})

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            AmenityMessages.PAST_RESERVATION_NOT_CANCELLABLE,
        )
        past_reservation.refresh_from_db()
        self.assertEqual(past_reservation.status, ReservationStatus.ACTIVE)


class ManagerReservationReportTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            phone="09120000001",
            password="ManagerPass123",
            full_name="Test Manager",
            national_id="1000000001",
            role="manager",
        )
        self.admin = User.objects.create_user(
            phone="09120000002",
            password="AdminPass123",
            full_name="Test Admin",
            national_id="1000000002",
            role="admin",
        )
        self.resident = User.objects.create_user(
            phone="09120000003",
            password="ResidentPass123",
            full_name="Alice Resident",
            national_id="1000000003",
            role="resident",
        )
        self.other_resident = User.objects.create_user(
            phone="09120000004",
            password="ResidentPass123",
            full_name="Bob Resident",
            national_id="1000000004",
            role="resident",
        )
        self.service_staff = User.objects.create_user(
            phone="09120000005",
            password="StaffPass123",
            full_name="Service Staff",
            national_id="1000000005",
            role="service_staff",
        )

        self.pool = Amenity.objects.create(name="Pool", operating_rules="08:00 تا 22:00", is_active=True)
        self.gym = Amenity.objects.create(name="Gym", operating_rules="08:00 تا 22:00", is_active=True)
        self.tennis = Amenity.objects.create(name="Tennis Court", operating_rules="08:00 تا 22:00", is_active=True)

        self.list_url = reverse("manager-reservations")
        self.base_time = timezone.localtime(timezone.now()).replace(
            hour=10, minute=0, second=0, microsecond=0
        ) + timedelta(days=5)

    def create_reservation(self, amenity, resident, start_time, duration=1, status=ReservationStatus.ACTIVE):
        return Reservation.objects.create(
            amenity=amenity,
            resident=resident,
            start_time=start_time,
            end_time=start_time + timedelta(hours=duration),
            status=status,
        )

    def test_manager_can_list_all_reservations(self):
        self.create_reservation(self.pool, self.resident, self.base_time)
        self.create_reservation(self.gym, self.other_resident, self.base_time + timedelta(hours=2))
        self.create_reservation(self.tennis, self.resident, self.base_time + timedelta(hours=4))

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 3)

        returned_ids = {reservation["id"] for reservation in response.data["reservations"]}
        self.assertEqual(returned_ids, set(Reservation.objects.values_list("id", flat=True)))

    def test_admin_can_list_all_reservations(self):
        self.create_reservation(self.pool, self.resident, self.base_time)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["reservations"]), 1)

    def test_resident_cannot_access_manager_reservation_report(self):
        self.client.force_authenticate(user=self.resident)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_service_staff_cannot_access_manager_reservation_report(self):
        self.client.force_authenticate(user=self.service_staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_by_amenity_name(self):
        pool_reservation = self.create_reservation(self.pool, self.resident, self.base_time)
        self.create_reservation(self.gym, self.other_resident, self.base_time + timedelta(hours=2))

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {"search": "Pool"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [pool_reservation.id])

    def test_search_by_status(self):
        active_reservation = self.create_reservation(
            self.pool, self.resident, self.base_time, status=ReservationStatus.ACTIVE
        )
        canceled_reservation = self.create_reservation(
            self.gym,
            self.other_resident,
            self.base_time + timedelta(hours=2),
            status=ReservationStatus.CANCELED,
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {"search": ReservationStatus.CANCELED})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [canceled_reservation.id])
        self.assertNotIn(active_reservation.id, returned_ids)

    def test_search_by_resident_full_name(self):
        alice_reservation = self.create_reservation(self.pool, self.resident, self.base_time)
        self.create_reservation(self.gym, self.other_resident, self.base_time + timedelta(hours=2))

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {"search": "Alice Resident"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [alice_reservation.id])

    def test_multi_term_search_uses_and_semantics(self):
        matching_reservation = self.create_reservation(
            self.pool,
            self.resident,
            self.base_time,
            status=ReservationStatus.CANCELED,
        )
        self.create_reservation(
            self.pool,
            self.resident,
            self.base_time + timedelta(hours=2),
            status=ReservationStatus.ACTIVE,
        )
        self.create_reservation(
            self.gym,
            self.other_resident,
            self.base_time + timedelta(hours=4),
            status=ReservationStatus.CANCELED,
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {"search": "Pool Canceled"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [matching_reservation.id])

    def test_amenity_filter(self):
        pool_reservation = self.create_reservation(self.pool, self.resident, self.base_time)
        self.create_reservation(self.gym, self.other_resident, self.base_time + timedelta(hours=2))

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {"amenity": self.pool.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [pool_reservation.id])

    def test_date_filter(self):
        target_date = self.base_time.date()

        reservation_on_target_date = self.create_reservation(self.pool, self.resident, self.base_time)
        self.create_reservation(self.gym, self.other_resident, self.base_time + timedelta(days=1))

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url, {"date": target_date.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [reservation_on_target_date.id])

    def test_amenity_and_search_filters_work_together(self):
        matching_reservation = self.create_reservation(
            self.pool,
            self.resident,
            self.base_time,
            status=ReservationStatus.CANCELED,
        )
        self.create_reservation(
            self.pool,
            self.resident,
            self.base_time + timedelta(hours=2),
            status=ReservationStatus.ACTIVE,
        )
        self.create_reservation(
            self.gym,
            self.other_resident,
            self.base_time + timedelta(hours=4),
            status=ReservationStatus.CANCELED,
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(
            self.list_url,
            {"amenity": self.pool.id, "search": "Canceled"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [matching_reservation.id])

    def test_reservations_are_ordered_newest_first(self):
        newest = self.create_reservation(self.pool, self.resident, self.base_time)
        oldest = self.create_reservation(self.gym, self.other_resident, self.base_time + timedelta(hours=3))
        middle = self.create_reservation(self.tennis, self.resident, self.base_time + timedelta(hours=1))

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [reservation["id"] for reservation in response.data["reservations"]]
        self.assertEqual(returned_ids, [newest.id, middle.id, oldest.id])

    def test_report_contains_required_reservation_data(self):
        self.create_reservation(self.pool, self.resident, self.base_time)

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        reservation = response.data["reservations"][0]
        self.assertIn("amenity_name", reservation)
        self.assertIn("resident_name", reservation)
        self.assertIn("start_time", reservation)
        self.assertIn("end_time", reservation)
        self.assertIn("status", reservation)
        self.assertIn("created_at", reservation)
