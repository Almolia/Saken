// Occupancy values are sent to the API verbatim, so they keep the server's
// capitalisation.
export const OccupancyStatus = {
  OCCUPIED: 'Occupied',
  VACANT: 'Vacant',
  UNDER_RENOVATION: 'UnderRenovation',
}

export const occupancyStatusLabels = {
  [OccupancyStatus.OCCUPIED]: 'سکونت‌دار',
  [OccupancyStatus.VACANT]: 'خالی',
  [OccupancyStatus.UNDER_RENOVATION]: 'در حال بازسازی',
}

export const occupancyStatusOptions = [
  {
    value: OccupancyStatus.OCCUPIED,
    label: occupancyStatusLabels[OccupancyStatus.OCCUPIED],
    description: 'واحد در حال حاضر محل سکونت است.',
  },
  {
    value: OccupancyStatus.VACANT,
    label: occupancyStatusLabels[OccupancyStatus.VACANT],
    description: 'واحد خالی است و کسی در آن ساکن نیست.',
  },
  {
    value: OccupancyStatus.UNDER_RENOVATION,
    label: occupancyStatusLabels[OccupancyStatus.UNDER_RENOVATION],
    description: 'واحد به دلیل تعمیرات یا بازسازی قابل استفاده نیست.',
  },
]

// An unknown value is shown as-is rather than being silently relabelled, so a
// status added on the server side is visible instead of disappearing.
export function occupancyStatusLabel(status) {
  return occupancyStatusLabels[status] || status || '—'
}

const occupancyStatusTones = {
  [OccupancyStatus.OCCUPIED]: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  [OccupancyStatus.VACANT]: 'border-slate-200 bg-slate-100 text-slate-700',
  [OccupancyStatus.UNDER_RENOVATION]: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function occupancyStatusTone(status) {
  return occupancyStatusTones[status] || 'border-slate-200 bg-slate-50 text-slate-600'
}

// The occupancy status is manager-controlled and independent of the resident
// link, so the two can disagree — the directory flags that rather than hiding it.
export function hasOccupancyMismatch(unit) {
  if (!unit) return false
  if (unit.owner && unit.occupancy_status === OccupancyStatus.VACANT) return true
  if (!unit.owner && unit.occupancy_status === OccupancyStatus.OCCUPIED) return true
  return false
}

export function sortUnits(units = []) {
  return [...units].sort(
    (a, b) =>
      a.floor - b.floor ||
      String(a.unit_number).localeCompare(String(b.unit_number), 'fa', { numeric: true }),
  )
}
