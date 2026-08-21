import { request } from './api'
import { PollApiStatus } from '../utils/polls'

// Manager-facing poll endpoints.
//
// The list answers { polls: [...] } newest-first and carries every status,
// including the drafts residents never see. Each write endpoint answers
// { message, poll } with the poll re-read from the database, so the caller can
// drop the returned record straight into the list instead of refetching.
export const managerPollApi = {
  list() {
    return request('/manager/polls/')
  },
  get(pollId) {
    return request(`/manager/polls/${pollId}/`)
  },
  create(payload) {
    return request('/manager/polls/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  // Editing is only accepted while the poll is a draft; the backend answers 400
  // for anything else so that a published question can never change under the
  // residents who already voted on it.
  update(pollId, payload) {
    return request(`/manager/polls/${pollId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  /**
   * Publishes a draft, making it visible to the targeted residents.
   *
   * `starts_at` is mandatory on the server side and is re-sent even when the
   * draft already stores one, because the publish branch validates the request
   * body rather than the saved record.
   */
  publish(pollId, { startsAt = new Date().toISOString() } = {}) {
    return request(`/manager/polls/${pollId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: PollApiStatus.ACTIVE, starts_at: startsAt }),
    })
  },
  // Closing stops the voting for good — there is no reopen endpoint.
  close(pollId) {
    return request(`/manager/polls/${pollId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: PollApiStatus.CLOSED }),
    })
  },
  // Drafts only. A published poll answers 400 and must be closed instead.
  remove(pollId) {
    return request(`/manager/polls/${pollId}/`, {
      method: 'DELETE',
    })
  },
}
