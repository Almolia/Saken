import { describe, expect, it } from 'vitest'
import {
  OccupancyStatus,
  hasOccupancyMismatch,
  occupancyStatusLabel,
  occupancyStatusOptions,
  sortUnits,
} from './units'

describe('units', () => {
  describe('occupancyStatusLabel', () => {
    it('translates the known statuses', () => {
      expect(occupancyStatusLabel(OccupancyStatus.OCCUPIED)).toBe('سکونت‌دار')
      expect(occupancyStatusLabel(OccupancyStatus.VACANT)).toBe('خالی')
      expect(occupancyStatusLabel(OccupancyStatus.UNDER_RENOVATION)).toBe('در حال بازسازی')
    })

    it('shows an unknown status as-is instead of hiding it', () => {
      expect(occupancyStatusLabel('Sold')).toBe('Sold')
      expect(occupancyStatusLabel('')).toBe('—')
    })
  })

  describe('occupancyStatusOptions', () => {
    it('offers every status the API accepts', () => {
      expect(occupancyStatusOptions.map((option) => option.value)).toEqual([
        OccupancyStatus.OCCUPIED,
        OccupancyStatus.VACANT,
        OccupancyStatus.UNDER_RENOVATION,
      ])
    })
  })

  describe('hasOccupancyMismatch', () => {
    it('flags a linked resident on a vacant unit and an occupied unit with nobody', () => {
      expect(
        hasOccupancyMismatch({ owner: { id: 1 }, occupancy_status: OccupancyStatus.VACANT }),
      ).toBe(true)
      expect(hasOccupancyMismatch({ owner: null, occupancy_status: OccupancyStatus.OCCUPIED })).toBe(
        true,
      )
    })

    it('stays quiet when the two agree or the unit is under renovation', () => {
      expect(
        hasOccupancyMismatch({ owner: { id: 1 }, occupancy_status: OccupancyStatus.OCCUPIED }),
      ).toBe(false)
      expect(hasOccupancyMismatch({ owner: null, occupancy_status: OccupancyStatus.VACANT })).toBe(
        false,
      )
      expect(
        hasOccupancyMismatch({ owner: null, occupancy_status: OccupancyStatus.UNDER_RENOVATION }),
      ).toBe(false)
      expect(hasOccupancyMismatch(null)).toBe(false)
    })
  })

  describe('sortUnits', () => {
    it('orders by floor, then by unit number, without mutating the input', () => {
      const units = [
        { id: 1, floor: 2, unit_number: '201' },
        { id: 2, floor: 1, unit_number: '102' },
        { id: 3, floor: 1, unit_number: '101' },
      ]
      const sorted = sortUnits(units)

      expect(sorted.map((unit) => unit.id)).toEqual([3, 2, 1])
      expect(units.map((unit) => unit.id)).toEqual([1, 2, 3])
    })
  })
})
