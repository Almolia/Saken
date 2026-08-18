import { AlertTriangle, Building2, Home, Pencil, Plus, UserMinus, UserPlus, UserRound, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../../../components/ToastProvider'
import { useForm } from '../../../hooks/useForm'
import { managerApi } from '../../../lib/api'
import { validateUnit } from '../../../lib/validators'
import { formatArea } from '../../../utils/helpers'
import { hasOccupancyMismatch, occupancyStatusLabel, occupancyStatusTone, sortUnits } from '../../../utils/units'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { Modal } from '../../../components/ui/Modal'
import { InputField } from '../../../components/ui/InputField'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { UnitOccupancyModal } from '../../../components/dashboard/UnitOccupancyModal'
import { UnlinkResidentModal } from '../../../components/dashboard/UnlinkResidentModal'

export function UnitsSection({ users }) {
  const { showToast } = useToast()
  const [data, setData] = useState({ units: [], loading: true, error: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignState, setAssignState] = useState({ userId: '', loading: false, error: '' })
  const [occupancyTarget, setOccupancyTarget] = useState(null)
  const [unlinkTarget, setUnlinkTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true
    managerApi
      .units()
      .then((response) => active && setData({ units: sortUnits(response.units), loading: false, error: '' }))
      .catch((error) => active && setData((current) => ({ ...current, loading: false, error: error.message })))
    return () => {
      active = false
    }
  }, [refreshKey])

  const unassignedResidents = useMemo(() => {
    const ownerIds = new Set(data.units.map((unit) => unit.owner?.id).filter(Boolean))
    return users.filter((user) => user.role === 'resident' && !ownerIds.has(user.id))
  }, [data.units, users])

  const assignedCount = data.units.filter((unit) => unit.owner).length

  const unitForm = useForm({
    initialValues: { unit_number: '', floor: '', area: '' },
    validate: validateUnit,
    onSubmit: async (values) => {
      const response = await managerApi.createUnit({
        unit_number: values.unit_number.trim(),
        floor: Number.parseInt(values.floor, 10),
        area: values.area,
      })
      setData((current) => ({ ...current, units: sortUnits([...current.units, response.unit]) }))
      unitForm.setValues({ unit_number: '', floor: '', area: '' })
      setCreateOpen(false)
      showToast(response.message || 'واحد با موفقیت ایجاد شد.')
    },
  })

  function retryLoad() {
    setData((current) => ({ ...current, loading: true, error: '' }))
    setRefreshKey((current) => current + 1)
  }

  function openAssign(unit) {
    setAssignState({ userId: '', loading: false, error: '' })
    setAssignTarget(unit)
  }

  async function handleAssign(event) {
    event.preventDefault()
    if (!assignState.userId) {
      setAssignState((current) => ({ ...current, error: 'انتخاب ساکن الزامی است.' }))
      return
    }
    setAssignState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await managerApi.assignUnit(assignTarget.id, { user_id: Number(assignState.userId) })
      setData((current) => ({
        ...current,
        units: current.units.map((unit) => (unit.id === response.unit.id ? response.unit : unit)),
      }))
      setAssignTarget(null)
      showToast(response.message || 'واحد با موفقیت به کاربر اختصاص یافت.')
    } catch (error) {
      setAssignState((current) => ({ ...current, loading: false, error: error.message }))
    }
  }

  // Both edit modals answer with the unit as the server stored it, so the row
  // is replaced from that copy rather than being patched locally.
  function replaceUnit(updatedUnit) {
    setData((current) => ({
      ...current,
      units: sortUnits(current.units.map((item) => (item.id === updatedUnit.id ? updatedUnit : item))),
    }))
  }

  async function handleDelete(unit) {
    if (!window.confirm('آیا از حذف این واحد اطمینان دارید؟')) return
    setDeletingId(unit.id)
    try {
      const response = await managerApi.deleteUnit(unit.id)
      setData((current) => ({
        ...current,
        units: current.units.filter((item) => item.id !== unit.id),
      }))
      showToast(response?.message || 'واحد با موفقیت حذف شد.')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">فهرست واحدها</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">واحدهای ساختمان و ساکنان آن‌ها</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            در این بخش می‌توانید واحد جدید ثبت کنید، وضعیت سکونت هر واحد را ویرایش کنید و ساکن واحدهایی که تخلیه شده‌اند را حذف کنید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="کل واحدها" value={data.loading ? '—' : data.units.length} icon={Building2} tone="teal" />
        <SummaryCard title="دارای ساکن" value={data.loading ? '—' : assignedCount} icon={Users} tone="emerald" />
        <SummaryCard title="بدون ساکن" value={data.loading ? '—' : data.units.length - assignedCount} icon={Home} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست واحدها</h2>
            <p className="mt-1 text-sm text-slate-500">{data.loading ? 'در حال دریافت اطلاعات...' : `${data.units.length} واحد ثبت شده است.`}</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            واحد جدید
          </button>
        </div>

        {data.loading ? (
          <LoadingBlock />
        ) : data.error ? (
          <div className="space-y-4 p-6">
            <ServerError error={data.error} />
            <button type="button" onClick={retryLoad} className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
              تلاش مجدد
            </button>
          </div>
        ) : data.units.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">هنوز واحدی ثبت نشده است</h3>
            <p className="mt-2 text-sm text-slate-500">با دکمه «واحد جدید» اولین واحد ساختمان را ثبت کنید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">شماره واحد</th>
                  <th className="px-6 py-4">طبقه</th>
                  <th className="px-6 py-4">متراژ</th>
                  <th className="px-6 py-4">وضعیت سکونت</th>
                  <th className="px-6 py-4">ساکن</th>
                  <th className="px-6 py-4">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {data.units.map((unit) => (
                  <tr key={unit.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                          <Home className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-950">{unit.unit_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{unit.floor}</td>
                    <td className="px-6 py-4 font-bold">{formatArea(unit.area)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${occupancyStatusTone(unit.occupancy_status)}`}>
                        {occupancyStatusLabel(unit.occupancy_status)}
                      </span>
                      {hasOccupancyMismatch(unit) ? (
                        <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          با وضعیت ساکن هم‌خوانی ندارد
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {unit.owner ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-bold text-slate-950">{unit.owner.full_name}</div>
                            <div className="mt-0.5 text-xs font-medium text-slate-400" dir="ltr">{unit.owner.phone}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">بدون ساکن</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOccupancyTarget(unit)}
                          disabled={deletingId === unit.id}
                          aria-label={`ویرایش واحد ${unit.unit_number}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                          ویرایش
                        </button>
                        {!unit.owner ? (
                          <button
                            type="button"
                            onClick={() => openAssign(unit)}
                            disabled={deletingId === unit.id}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <UserPlus className="h-4 w-4" />
                            تعیین ساکن
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openAssign(unit)}
                              disabled={deletingId === unit.id}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              تغییر ساکن
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnlinkTarget(unit)}
                              disabled={deletingId === unit.id}
                              aria-label={`حذف ساکن واحد ${unit.unit_number}`}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UserMinus className="h-4 w-4" />
                              حذف ساکن
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(unit)}
                          disabled={deletingId === unit.id}
                          className="inline-flex h-10 items-center justify-center rounded-2xl bg-rose-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          حذف واحد
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={createOpen}
        title="ثبت واحد جدید"
        description="مشخصات واحد را وارد کنید."
        onClose={() => setCreateOpen(false)}
        loading={unitForm.loading}
        closeOnBackdrop={false}
      >
        <form className="space-y-4" onSubmit={unitForm.handleSubmit}>
          <InputField label="شماره واحد" name="unit_number" type="text" value={unitForm.values.unit_number} onChange={unitForm.handleChange} error={unitForm.errors.unit_number} placeholder="مثلاً 102" />
          <InputField label="طبقه" name="floor" type="text" value={unitForm.values.floor} onChange={unitForm.handleChange} error={unitForm.errors.floor} placeholder="مثلاً 1" />
          <InputField label="متراژ (متر مربع)" name="area" type="text" value={unitForm.values.area} onChange={unitForm.handleChange} error={unitForm.errors.area} placeholder="مثلاً 85" />
          <ServerError error={unitForm.serverError} />
          <PrimaryButton loading={unitForm.loading}>ثبت واحد</PrimaryButton>
        </form>
      </Modal>

      <Modal
        open={Boolean(assignTarget)}
        title={`${assignTarget?.owner ? 'تغییر ساکن' : 'تعیین ساکن'} واحد ${assignTarget?.unit_number ?? ''}`}
        description={
          assignTarget?.owner
            ? `ساکن فعلی «${assignTarget.owner.full_name}» با کاربر انتخابی جایگزین می‌شود.`
            : 'یکی از کاربران بدون واحد را انتخاب کنید.'
        }
        onClose={() => setAssignTarget(null)}
        loading={assignState.loading}
        closeOnBackdrop={false}
      >
        {unassignedResidents.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium leading-7 text-slate-600">
            در حال حاضر کاربر ساکنِ بدون واحد وجود ندارد. ابتدا از بخش کاربران مطمئن شوید کاربر مورد نظر با نقش «ساکن» ثبت شده است.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleAssign}>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">ساکن</span>
              <select
                value={assignState.userId}
                onChange={(event) => setAssignState((current) => ({ ...current, userId: event.target.value, error: '' }))}
                className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${assignState.error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
              >
                <option value="">انتخاب کنید...</option>
                {unassignedResidents.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} — {user.phone}
                  </option>
                ))}
              </select>
              {assignState.error ? <small className="mt-2 block text-xs font-medium text-rose-600">{assignState.error}</small> : null}
            </label>
            <PrimaryButton loading={assignState.loading}>تعیین ساکن</PrimaryButton>
          </form>
        )}
      </Modal>

      {occupancyTarget ? (
        <UnitOccupancyModal
          open
          unit={occupancyTarget}
          onClose={() => setOccupancyTarget(null)}
          onUpdated={replaceUnit}
        />
      ) : null}

      {unlinkTarget ? (
        <UnlinkResidentModal
          open
          unit={unlinkTarget}
          onClose={() => setUnlinkTarget(null)}
          onUpdated={replaceUnit}
        />
      ) : null}
    </>
  )
}
