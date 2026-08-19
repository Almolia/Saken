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

// Manager-facing amenity endpoints. The reservation log spans every amenity
// and every resident, so it is the only place the building's booking history
// can be read as a whole.
export const managerAmenityApi = {
  /**
   * The complete reservation log, narrowed server-side.
   *
   * `search` is a single global term the endpoint matches against the amenity
   * name, the reservation status and the resident's name; `amenity` and `date`
   * are the endpoint's own filters, kept here so narrowing by facility or day
   * never has to go through the text box.
   */
  reservations({ search = '', amenity = '', date = '' } = {}) {
    const params = new URLSearchParams()
    const term = String(search ?? '').trim()
    const amenityId = String(amenity ?? '').trim()
    const day = String(date ?? '').trim()

    if (term) params.set('search', term)
    if (amenityId) params.set('amenity', amenityId)
    if (day) params.set('date', day)

    const query = params.toString()
    return request(`/manager/reservations/${query ? `?${query}` : ''}`)
  },
  amenities() {
    return request('/amenities/')
  },
}

export { amenityApi as residentAmenityApi }
