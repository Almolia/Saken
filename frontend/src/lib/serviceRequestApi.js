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

// Manager-facing service request endpoints for viewing and assigning requests.
export const managerServiceRequestApi = {
  listAll() {
    return request('/manager/requests/')
  },
  assignStaff(requestId, payload) {
    return request(`/manager/requests/${requestId}/assign/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
}

// Service-staff-facing endpoints. The list is already scoped server-side to the
// requests assigned to the signed-in staff member.
export const staffServiceRequestApi = {
  listAssigned() {
    return request('/staff/requests/')
  },
  // Submitting a work_report is what flips the request to "Completed"; the
  // backend applies that transition itself.
  submitWorkReport(requestId, workReport) {
    return request(`/staff/requests/${requestId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ work_report: workReport }),
    })
  },
}
