import { Building2, Users } from 'lucide-react'
import { useMemo } from 'react'
import { ServerError } from '../ui/ServerError'
import { sortUnits } from '../../utils/units'

/**
 * Who the poll is put to: the whole building, or a named subset of units.
 *
 * The API models "everyone" as an empty target list, so the two choices are one
 * value here and the empty array is only built when the form is submitted.
 */
export function PollTargetField({
  targetAll,
  onTargetAllChange,
  selectedIds,
  onSelectedIdsChange,
  units = [],
  unitsError = '',
  error = '',
  disabled = false,
}) {
  const ordered = useMemo(() => sortUnits(units), [units])

  function toggleUnit(unitId) {
    onSelectedIdsChange(
      selectedIds.includes(unitId)
        ? selectedIds.filter((id) => id !== unitId)
        : [...selectedIds, unitId],
    )
  }

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 block text-sm font-bold text-slate-700">واحدهای هدف نظرسنجی</legend>

      <div className="grid gap-2 sm:grid-cols-2">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
            targetAll
              ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name="poll_target_scope"
            checked={targetAll}
            onChange={() => onTargetAllChange(true)}
            className="mt-1 h-4 w-4 accent-teal-600"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">همه واحدها</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              هر ساکن ساختمان می‌تواند در این نظرسنجی رأی بدهد.
            </span>
          </span>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
            !targetAll
              ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-100'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <input
            type="radio"
            name="poll_target_scope"
            checked={!targetAll}
            onChange={() => onTargetAllChange(false)}
            className="mt-1 h-4 w-4 accent-teal-600"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">واحدهای منتخب</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              فقط ساکنان واحدهای انتخاب‌شده این نظرسنجی را می‌بینند.
            </span>
          </span>
        </label>
      </div>

      {!targetAll ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold text-slate-700">
              {selectedIds.length} از {ordered.length} واحد انتخاب شده
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSelectedIdsChange(ordered.map((unit) => unit.id))}
                className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-teal-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-teal-50"
              >
                انتخاب همه
              </button>
              <button
                type="button"
                onClick={() => onSelectedIdsChange([])}
                className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                لغو همه
              </button>
            </div>
          </div>

          {unitsError ? (
            <ServerError error={unitsError} />
          ) : ordered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs font-bold text-slate-500">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              هنوز واحدی در ساختمان ثبت نشده است.
            </div>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto pe-1">
              {ordered.map((unit) => {
                const isSelected = selectedIds.includes(unit.id)
                return (
                  <label
                    key={unit.id}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-xs transition ${
                      isSelected
                        ? 'border-teal-400 bg-teal-50/80 font-bold text-teal-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUnit(unit.id)}
                        className="h-4 w-4 rounded accent-teal-600"
                      />
                      <span>
                        واحد {unit.unit_number} (طبقه {unit.floor})
                      </span>
                    </span>
                    {/* A vacant unit has nobody to answer the poll, which is
                        worth seeing before it is added to the target list. */}
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {unit.owner?.full_name || 'بدون ساکن'}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          {error ? (
            <small className="mt-2 block text-xs font-medium text-rose-600" role="alert">
              {error}
            </small>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  )
}
