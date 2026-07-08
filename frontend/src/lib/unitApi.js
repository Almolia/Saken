// Mock implementation of GET /api/my-unit/ so the dashboard UI can be
// reviewed before the backend is wired up. The payload mirrors the real
// UnitSerializer response (single object, or an array for multi-unit users).
//
// To switch to the real backend, replace the myUnit body with:
//   return request('/my-unit/')
// (import { request } needs to be exported from ./api.js first.)

const MOCK_UNIT = {
  id: 1,
  unit_number: '102',
  floor: 1,
  area: '85.00',
  building: 1,
  details: '',
}

const MOCK_DELAY_MS = 900

export const unitApi = {
  myUnit() {
    return new Promise((resolve) => {
      window.setTimeout(() => resolve(MOCK_UNIT), MOCK_DELAY_MS)
    })
  },
}
