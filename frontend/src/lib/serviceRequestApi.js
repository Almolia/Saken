import { request } from './api'

// Resident-facing maintenance request endpoints. Authentication is handled by
// request(), which always sends the JWT cookies with the request.
export const serviceRequestApi = {
  list() {
    return request('/requests/')
  },
  create(payload) {
    return request('/requests/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
