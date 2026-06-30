import { BadgeCheck, LoaderCircle, ShieldCheck, Users } from 'lucide-react'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { RoleBadge } from '../../../components/ui/RoleBadge'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { EmptyState } from '../../../components/ui/EmptyState'
import { UserCell } from '../../../components/ui/UserCell'
import { ServerError } from '../../../components/ui/ServerError'

export function RolesSection({ data, filteredUsers, search, setSearch, authState, actionState, changeRole }) {
  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">مدیریت نقش‌ها</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">تعیین نقش کاربران سامانه</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">در این بخش فقط نقش کاربران غیرادمین بین «ساکن» و «مدیر» تغییر می‌کند.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="کل کاربران" value={data.stats?.total ?? '—'} icon={Users} tone="teal" />
        <SummaryCard title="مدیرها" value={data.stats?.managers ?? '—'} icon={ShieldCheck} tone="emerald" />
        <SummaryCard title="ساکن‌ها" value={data.stats?.residents ?? '—'} icon={BadgeCheck} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-950">فهرست کاربران</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredUsers.length} کاربر نمایش داده شده است.</p>
          </div>
          {search ? <button type="button" onClick={() => setSearch('')} className="self-start rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 sm:self-auto">پاک کردن جستجو</button> : null}
        </div>

        {data.loading ? (
          <LoadingBlock />
        ) : data.error ? (
          <div className="p-6"><ServerError error={data.error} /></div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">کاربر</th>
                  <th className="px-6 py-4">نام کاربری</th>
                  <th className="px-6 py-4">شماره موبایل</th>
                  <th className="px-6 py-4">کد ملی</th>
                  <th className="px-6 py-4">نقش فعلی</th>
                  <th className="px-6 py-4">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === authState.user.id
                  const roleLoading = Boolean(actionState[`role-${user.id}`])
                  const isAdmin = user.role === 'admin'
                  return (
                    <tr key={user.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4"><UserCell user={user} isSelf={isSelf} /></td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.username || '—'}</td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.phone}</td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.national_id}</td>
                      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4">
                        {!isAdmin ? (
                          <button
                            type="button"
                            onClick={() => changeRole(user, user.role === 'resident' ? 'manager' : 'resident')}
                            disabled={roleLoading || isSelf}
                            title={isSelf ? 'امکان تغییر نقش حساب جاری وجود ندارد.' : undefined}
                            className="inline-flex h-10 items-center justify-center rounded-2xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {roleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : user.role === 'resident' ? 'تبدیل به مدیر' : 'تبدیل به ساکن'}
                          </button>
                        ) : (
                          <span className="inline-flex h-10 items-center rounded-2xl bg-slate-950 px-4 text-xs font-bold text-white">ادمین</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}