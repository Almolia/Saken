import { request } from './api'

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
  cancelReservation(reservationId) {
    return request(`/resident/reservations/${reservationId}/cancel/`, {
      method: 'POST',
    })
  },
}

export { amenityApi as residentAmenityApi }
