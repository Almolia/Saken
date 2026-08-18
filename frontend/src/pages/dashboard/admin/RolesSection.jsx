import { BadgeCheck, ShieldCheck, Users, Wrench } from 'lucide-react'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { RoleBadge } from '../../../components/ui/RoleBadge'
import { RoleSelect } from '../../../components/ui/RoleSelect'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { EmptyState } from '../../../components/ui/EmptyState'
import { UserCell } from '../../../components/ui/UserCell'
import { Toggle } from '../../../components/ui/Toggle'
import { ServerError } from '../../../components/ui/ServerError'

export function RolesSection({ data, filteredUsers, search, setSearch, authState, actionState, changeRole, changeStatus }) {
  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">مدیریت نقش‌ها</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">تعیین نقش کاربران سامانه</h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">نقش کاربران غیرادمین را می‌توانید بین «ساکن»، «مدیر» و «کارکنان خدمات» تغییر دهید و حساب هر کاربر را فعال یا غیرفعال کنید.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="کل کاربران" value={data.stats?.total ?? '—'} icon={Users} tone="teal" />
        <SummaryCard title="مدیرها" value={data.stats?.managers ?? '—'} icon={ShieldCheck} tone="emerald" />
        <SummaryCard title="ساکن‌ها" value={data.stats?.residents ?? '—'} icon={BadgeCheck} tone="blue" />
        <SummaryCard title="کارکنان خدمات" value={data.stats?.service_staff ?? '—'} icon={Wrench} tone="teal" />
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
            <table className="w-full min-w-[900px] text-right">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">کاربر</th>
                  <th className="px-6 py-4">نام کاربری</th>
                  <th className="px-6 py-4">شماره موبایل</th>
                  <th className="px-6 py-4">نقش فعلی</th>
                  <th className="px-6 py-4">وضعیت حساب</th>
                  <th className="px-6 py-4">تغییر نقش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === authState.user.id
                  const roleLoading = Boolean(actionState[`role-${user.id}`])
                  const statusLoading = Boolean(actionState[`status-${user.id}`])
                  const isAdmin = user.role === 'admin'
                  const isActive = user.is_active !== false
                  const statusLocked = isSelf || isAdmin

                  return (
                    <tr key={user.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4"><UserCell user={user} isSelf={isSelf} /></td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.username || '—'}</td>
                      <td className="px-6 py-4 font-bold" dir="ltr">{user.phone}</td>
                      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Toggle
                            checked={isActive}
                            onChange={(isActive) => changeStatus(user, isActive)}
                            disabled={statusLocked}
                            loading={statusLoading}
                            ariaLabel={isSelf ? 'امکان تغییر وضعیت حساب جاری وجود ندارد.' : `تغییر وضعیت حساب ${user.full_name}`}
                            title={isSelf ? 'امکان تغییر وضعیت حساب جاری وجود ندارد.' : undefined}
                          />
                          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-rose-100'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {isActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {!isAdmin ? (
                          <RoleSelect
                            value={user.role}
                            onChange={(role) => changeRole(user, role)}
                            disabled={isSelf}
                            loading={roleLoading}
                            label={`نقش ${user.full_name}`}
                            title={isSelf ? 'امکان تغییر نقش حساب جاری وجود ندارد.' : undefined}
                          />
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
