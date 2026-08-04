// The API sends capitalised statuses ("Pending"/"Assigned"/"Completed").
// Everything in the UI compares against these normalised lowercase values.
export const RequestStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
}

export function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase()
}

export function isCompleted(serviceRequest) {
  return normalizeStatus(serviceRequest?.status) === RequestStatus.COMPLETED
}
