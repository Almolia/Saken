import { request } from './api'

// Resident-facing unit endpoints. Auth rides on the JWT cookie — request()
// always sends credentials: 'include'. A 404 means no unit is assigned;
// useMyUnit maps it to the empty state instead of an error.
export const unitApi = {
  myUnit() {
    return request('/my-unit/')
  },
}
