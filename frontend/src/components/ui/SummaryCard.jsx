const toneStyles = {
  teal: {
    icon: 'bg-teal-50 text-teal-700 ring-teal-100',
    value: 'text-teal-800',
    accent: 'bg-teal-500',
    emphasized: 'border-teal-200 bg-gradient-to-br from-white to-teal-50/70',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    value: 'text-emerald-800',
    accent: 'bg-emerald-500',
    emphasized: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    value: 'text-emerald-800',
    accent: 'bg-emerald-500',
    emphasized: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70',
  },
  blue: {
    icon: 'bg-blue-50 text-blue-700 ring-blue-100',
    value: 'text-blue-800',
    accent: 'bg-blue-500',
    emphasized: 'border-blue-200 bg-gradient-to-br from-white to-blue-50/70',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700 ring-amber-100',
    value: 'text-amber-800',
    accent: 'bg-amber-500',
    emphasized: 'border-amber-200 bg-gradient-to-br from-white to-amber-50/70',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-700 ring-orange-100',
    value: 'text-orange-800',
    accent: 'bg-orange-500',
    emphasized: 'border-orange-200 bg-gradient-to-br from-white to-orange-50/70',
  },
  red: {
    icon: 'bg-rose-50 text-rose-700 ring-rose-100',
    value: 'text-rose-800',
    accent: 'bg-rose-500',
    emphasized: 'border-rose-200 bg-gradient-to-br from-white to-rose-50/70',
  },
}

export function SummaryCard({ title, value, icon: Icon, tone = 'teal', emphasized = false }) {
  const styles = toneStyles[tone] || toneStyles.teal

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-slate-200/60 ${
        emphasized ? styles.emphasized : 'border-slate-200 bg-white'
      }`}
    >
      {emphasized ? (
        <span className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} aria-hidden="true" />
      ) : null}
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <h3
            className={`mt-3 break-words text-4xl font-black tracking-tight ${
              emphasized ? styles.value : 'text-slate-950'
            }`}
            aria-live="polite"
          >
            {value}
          </h3>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${styles.icon}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
