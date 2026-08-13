import { request } from './api'

export const managerChargeApi = {
  list() {
    return request('/manager/charges/')
  },
  create(payload) {
    return request('/manager/charges/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  financialSummary() {
    return request('/manager/reports/financial/summary/')
  },
  search(search = '') {
    const query = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : ''
    return request(`/manager/charges/search/${query}`)
  },
}

export const billingApi = {
  getCharges() {
    return managerChargeApi.list()
  },
  createCharge(payload) {
    return managerChargeApi.create(payload)
  },
}

// Resident-facing billing endpoints. Auth rides on the JWT cookie; request()
// always sends credentials: 'include'.
export const residentChargeApi = {
  pending() {
    return request('/resident/charges/pending/')
  },
  history() {
    return request('/resident/charges/history/')
  },
  // The backend settles every id in one atomic transaction, so a partially
  // applied payment can never come back: it either all succeeds or it 400s.
  pay(chargeIds) {
    return request('/resident/charges/pay/', {
      method: 'POST',
      body: JSON.stringify({ charge_ids: chargeIds }),
    })
  },
}
