export function SummaryCard({ title, value, icon: Icon, tone }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  }
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <h3 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</h3>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}