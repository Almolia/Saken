import { Building, Clock, Edit2, Plus, Trash2, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../../components/ToastProvider'
import { managerApi } from '../../../lib/api'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { AmenityFormModal } from '../../../components/dashboard/AmenityFormModal'

function sortAmenities(amenities) {
  return [...amenities].sort((a, b) => {
    // Active first, then alphabetically
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1
    }
    return a.name.localeCompare(b.name, 'fa')
  })
}

export function AmenitiesSection() {
  const { showToast } = useToast()
  const [data, setData] = useState({ amenities: [], loading: true, error: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true
    managerApi
      .amenities()
      .then((response) =>
        active && setData({ amenities: sortAmenities(response.amenities), loading: false, error: '' })
      )
      .catch((error) =>
        active && setData((current) => ({ ...current, loading: false, error: error.message }))
      )
    return () => {
      active = false
    }
  }, [refreshKey])

  function retryLoad() {
    setData((current) => ({ ...current, loading: true, error: '' }))
    setRefreshKey((current) => current + 1)
  }

  async function handleCreate(values) {
    const response = await managerApi.createAmenity(values)
    setData((current) => ({
      ...current,
      amenities: sortAmenities([...current.amenities, response.amenity]),
    }))
    showToast(response.message || 'امکان با موفقیت اضافه شد.')
  }

  async function handleUpdate(values) {
    const response = await managerApi.updateAmenity(editTarget.id, values)
    setData((current) => ({
      ...current,
      amenities: sortAmenities(
        current.amenities.map((item) => (item.id === response.amenity.id ? response.amenity : item))
      ),
    }))
    showToast(response.message || 'امکان با موفقیت به‌روزرسانی شد.')
    setEditTarget(null)
  }

  async function handleDelete(amenity) {
    if (!window.confirm(`آیا از حذف امکان «${amenity.name}» اطمینان دارید؟`)) {
      return
    }
    setDeletingId(amenity.id)
    try {
      const response = await managerApi.deleteAmenity(amenity.id)
      setData((current) => ({
        ...current,
        amenities: current.amenities.filter((item) => item.id !== amenity.id),
      }))
      showToast(response?.message || 'امکان با موفقیت حذف شد.')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const activeCount = data.amenities.filter((a) => a.is_active).length
  const inactiveCount = data.amenities.length - activeCount

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">مدیریت امکانات</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            امکانات و فضاهای مشترک ساختمان
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            در این بخش می‌توانید امکانات مشترک ساختمان مانند باشگاه، پارکینگ، فضای سبز و غیره را تعریف و مدیریت کنید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="کل امکانات" value={data.loading ? '—' : data.amenities.length} icon={Building} tone="teal" />
        <SummaryCard title="فعال" value={data.loading ? '—' : activeCount} icon={Wifi} tone="emerald" />
        <SummaryCard title="غیرفعال" value={data.loading ? '—' : inactiveCount} icon={Clock} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست امکانات</h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.loading
                ? 'در حال دریافت اطلاعات...'
                : `${data.amenities.length} امکان ثبت شده است.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            امکان جدید
          </button>
        </div>

        {data.loading ? (
          <LoadingBlock />
        ) : data.error ? (
          <div className="space-y-4 p-6">
            <ServerError error={data.error} />
            <button
              type="button"
              onClick={retryLoad}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              تلاش مجدد
            </button>
          </div>
        ) : data.amenities.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Building className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">هنوز امکانی تعریف نشده است</h3>
            <p className="mt-2 text-sm text-slate-500">
              با دکمه «امکان جدید» اولین امکان ساختمان را ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
            {data.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className={`group relative rounded-2xl border p-5 transition ${
                  amenity.is_active
                    ? 'border-slate-200 bg-white hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100'
                    : 'border-slate-100 bg-slate-50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        amenity.is_active ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950">{amenity.name}</h3>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                          amenity.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {amenity.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditTarget(amenity)}
                      disabled={deletingId === amenity.id}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="ویرایش"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(amenity)}
                      disabled={deletingId === amenity.id}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {amenity.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-500 line-clamp-2">{amenity.description}</p>
                )}

                {amenity.operating_rules && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{amenity.operating_rules}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <AmenityFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <AmenityFormModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        amenity={editTarget}
        onSubmit={handleUpdate}
      />
    </>
  )
}
