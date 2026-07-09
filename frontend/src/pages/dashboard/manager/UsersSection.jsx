import { BadgeCheck, ShieldCheck, Users } from 'lucide-react'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { RoleBadge } from '../../../components/ui/RoleBadge'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { ServerError } from '../../../components/ui/ServerError'
import { UserCell } from '../../../components/ui/UserCell'

export function UsersSection({ data, authState }) {
  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">کاربران</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">فهرست کاربران سامانه</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">نمای کلی کاربران و نقش‌های آن‌ها؛ تغییر نقش فقط توسط ادمین انجام می‌شود.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="کل کاربران" value={data.stats?.total ?? '—'} icon={Users} tone="teal" />
        <SummaryCard title="مدیرها" value={data.stats?.managers ?? '—'} icon={ShieldCheck} tone="emerald" />
        <SummaryCard title="ساکن‌ها" value={data.stats?.residents ?? '—'} icon={BadgeCheck} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-black text-slate-950">فهرست کاربران</h2>
          <p className="mt-1 text-sm text-slate-500">{data.loading ? 'در حال دریافت اطلاعات...' : `${data.users.length} کاربر ثبت شده است.`}</p>
        </div>

        {data.loading ? (
          <LoadingBlock />
        ) : data.error ? (
          <div className="p-6"><ServerError error={data.error} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">کاربر</th>
                  <th className="px-6 py-4">نام کاربری</th>
                  <th className="px-6 py-4">شماره موبایل</th>
                  <th className="px-6 py-4">نقش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {data.users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4"><UserCell user={user} isSelf={user.id === authState.user.id} /></td>
                    <td className="px-6 py-4 font-bold" dir="ltr">{user.username || '—'}</td>
                    <td className="px-6 py-4 font-bold" dir="ltr">{user.phone}</td>
                    <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
