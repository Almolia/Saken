import { Archive, ArchiveRestore, CalendarDays, Edit2, Megaphone, Plus, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../../components/ToastProvider'
import { useManagerAnnouncements } from '../../../hooks/useManagerAnnouncements'
import { managerApi } from '../../../lib/api'
import { formatDate } from '../../../utils/helpers'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { AnnouncementFormModal } from '../../../components/dashboard/AnnouncementFormModal'
import { DeleteAnnouncementModal } from '../../../components/dashboard/DeleteAnnouncementModal'

export function AnnouncementsSection() {
  const { showToast } = useToast()
  const {
    announcements,
    loading,
    error,
    retry,
    addAnnouncement,
    replaceAnnouncement,
    removeAnnouncement,
  } = useManagerAnnouncements()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  // Id of the announcement whose visibility is being flipped, so only that
  // card's buttons lock while the PATCH is in flight.
  const [togglingId, setTogglingId] = useState(null)

  // Both handlers let the error escape: the modal catches it, shows it inline
  // and stays open with the typed text intact.
  async function handleCreate(values) {
    const response = await managerApi.createAnnouncement(values)
    addAnnouncement(response?.announcement)
    showToast(response?.message || 'اطلاعیه با موفقیت منتشر شد.')
  }

  async function handleUpdate(values) {
    const response = await managerApi.updateAnnouncement(editTarget.id, values)
    replaceAnnouncement(response?.announcement)
    showToast(response?.message || 'اطلاعیه با موفقیت به‌روزرسانی شد.')
  }

  async function handleToggleActive(announcement) {
    setTogglingId(announcement.id)
    try {
      const response = await managerApi.updateAnnouncement(announcement.id, {
        is_active: !announcement.is_active,
      })
      replaceAnnouncement(response?.announcement)
      showToast(
        announcement.is_active
          ? 'اطلاعیه بایگانی شد و دیگر به ساکنان نمایش داده نمی‌شود.'
          : 'اطلاعیه دوباره برای ساکنان منتشر شد.',
      )
    } catch (toggleError) {
      showToast(toggleError.message || 'تغییر وضعیت اطلاعیه ناموفق بود.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const publishedCount = announcements.filter((item) => item.is_active).length
  const archivedCount = announcements.length - publishedCount

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">اطلاع‌رسانی به ساکنان</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            اطلاعیه‌های ساختمان
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            اطلاعیه‌های عمومی ساختمان را از اینجا منتشر کنید تا در داشبورد همه ساکنان نمایش داده شود. هر اطلاعیه را می‌توانید بعداً ویرایش، بایگانی یا حذف کنید.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="کل اطلاعیه‌ها"
          value={loading ? '—' : announcements.length}
          icon={Megaphone}
          tone="teal"
        />
        <SummaryCard
          title="منتشرشده"
          value={loading ? '—' : publishedCount}
          icon={ArchiveRestore}
          tone="emerald"
        />
        <SummaryCard
          title="بایگانی‌شده"
          value={loading ? '—' : archivedCount}
          icon={Archive}
          tone="blue"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست اطلاعیه‌ها</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'در حال دریافت اطلاعات...'
                : `${announcements.length} اطلاعیه ثبت شده است.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            انتشار اطلاعیه جدید
          </button>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="space-y-4 p-6">
            <ServerError error={error} />
            <button
              type="button"
              onClick={retry}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              تلاش مجدد
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900">هنوز اطلاعیه‌ای منتشر نشده است</h3>
            <p className="mt-2 text-sm text-slate-500">
              با دکمه «انتشار اطلاعیه جدید» اولین اطلاعیه ساختمان را برای ساکنان بفرستید.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {announcements.map((announcement) => {
              const busy = togglingId === announcement.id
              return (
                <li
                  key={announcement.id}
                  className={`px-5 py-5 transition sm:px-6 ${
                    announcement.is_active ? 'bg-white' : 'bg-slate-50/70'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">{announcement.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            announcement.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {announcement.is_active ? 'در دید ساکنان' : 'پنهان از ساکنان'}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                        {announcement.content}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(announcement.created_at)}
                        </span>
                        {announcement.author_name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5" />
                            {announcement.author_name}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditTarget(announcement)}
                        disabled={busy}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(announcement)}
                        disabled={busy}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {announcement.is_active ? (
                          <Archive className="h-3.5 w-3.5" />
                        ) : (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        )}
                        {announcement.is_active ? 'بایگانی' : 'انتشار مجدد'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(announcement)}
                        disabled={busy}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Mounted only while open so a closed form is a cleared form. */}
      {createOpen ? (
        <AnnouncementFormModal
          open
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      {editTarget ? (
        <AnnouncementFormModal
          open
          announcement={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteAnnouncementModal
          open
          announcement={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={removeAnnouncement}
        />
      ) : null}
    </>
  )
}
