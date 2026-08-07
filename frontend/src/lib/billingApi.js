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
}

export const billingApi = {
  getCharges() {
    return managerChargeApi.list()
  },
  createCharge(payload) {
    return managerChargeApi.create(payload)
  },
}
