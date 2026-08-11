import { request } from './api'
import { ReservationApiStatus } from '../utils/reservations'

export const amenityApi = {
  list() {
    return request('/amenities/')
  },
  getSlots(amenityId, dateStr) {
    const params = dateStr ? `?date=${dateStr}` : ''
    return request(`/amenities/${amenityId}/slots/${params}`)
  },
  createReservation(payload) {
    return request('/resident/reservations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  myReservations() {
    return request('/resident/reservations/')
  },
  // Cancelling is a status change on the booking itself. The backend refuses
  // the call for bookings that already started or were canceled before, and
  // frees the slot for other residents as soon as it succeeds.
  cancelReservation(reservationId) {
    return request(`/resident/reservations/${reservationId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: ReservationApiStatus.CANCELED }),
    })
  },
}

export { amenityApi as residentAmenityApi }
