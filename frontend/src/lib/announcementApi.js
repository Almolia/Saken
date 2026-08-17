import { request } from './api'

// Resident-facing announcements. The endpoint is read-only and already filters
// out the archived records, so whatever it returns is what the resident should
// see, newest first.
export const residentAnnouncementApi = {
  list() {
    return request('/resident/announcements/')
  },
}
