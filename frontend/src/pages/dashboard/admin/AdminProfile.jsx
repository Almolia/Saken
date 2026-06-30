import { LogOut, UserCog } from 'lucide-react'
import { roleLabels } from '../../../utils/constants'

export function AdminProfile({ user, onLogout }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-300/15 text-teal-200">
          <UserCog className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{user.full_name}</div>
          <div className="text-xs text-slate-400">{roleLabels[user.role]}</div>
        </div>
      </div>
      <button className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold text-slate-100 transition hover:bg-white/15" type="button" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        خروج
      </button>
    </div>
  )
}