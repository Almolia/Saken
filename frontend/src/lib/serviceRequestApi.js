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

// Manager-facing service request endpoints for viewing, assigning, summarizing, and searching requests.
export const managerServiceRequestApi = {
  // Accepts either a bare search string (the original call shape, kept for the
  // reports view) or typed filters. The endpoint answers
  // newest-first unless ordering says otherwise, and omitting status returns
  // every request.
  listAll(options = '') {
    const {
      search = '',
      status = '',
      ordering = '',
      createdAfter = '',
      createdBefore = '',
    } = typeof options === 'string' ? { search: options } : options || {}

    const params = new URLSearchParams()
    if (typeof search === 'string' && search.trim()) params.set('search', search.trim())
    if (typeof status === 'string' && status.trim()) params.set('status', status.trim())
    if (typeof ordering === 'string' && ordering.trim()) params.set('ordering', ordering.trim())
    if (typeof createdAfter === 'string' && createdAfter.trim()) {
      params.set('created_after', createdAfter.trim())
    }
    if (typeof createdBefore === 'string' && createdBefore.trim()) {
      params.set('created_before', createdBefore.trim())
    }

    const query = params.toString()
    return request(`/manager/requests/${query ? `?${query}` : ''}`)
  },
  summary() {
    return request('/manager/requests/summary/')
  },
  search(search = '') {
    const query = typeof search === 'string' && search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : ''
    return request(`/manager/requests/${query}`)
  },
  assignStaff(requestId, payload) {
    return request(`/manager/requests/${requestId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        assigned_staff_id: payload.assigned_staff_id ?? payload.staff_id,
      }),
    })
  },
  // Routes the cost of a completed request. The backend applies the balance
  // changes and marks the request settled in one transaction.
  settleRequest(requestId, payload) {
    return request(`/manager/requests/${requestId}/settle/`, {
      method: 'POST',
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
  // backend applies that transition itself. Sending the same call with new text
  // rewrites the report and leaves the request completed.
  submitWorkReport(requestId, workReport) {
    return request(`/staff/requests/${requestId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ work_report: workReport }),
    })
  },
  // Clearing the report reopens the request, so it returns to the open list.
  clearWorkReport(requestId) {
    return request(`/staff/requests/${requestId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ work_report: '' }),
    })
  },
}
