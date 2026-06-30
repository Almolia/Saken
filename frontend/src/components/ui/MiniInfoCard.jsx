export function MiniInfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-200/70">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-2 break-words text-lg font-black text-slate-950">{value}</div>
    </div>
  )
}