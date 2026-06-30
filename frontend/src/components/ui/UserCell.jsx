import { UserRound } from 'lucide-react'

export function UserCell({ user, isSelf }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <UserRound className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-black text-slate-950">{user.full_name}</span>
          {isSelf ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">شما</span> : null}
        </div>
        <div className="mt-1 text-xs font-medium text-slate-400">شناسه: {user.id}</div>
      </div>
    </div>
  )
}