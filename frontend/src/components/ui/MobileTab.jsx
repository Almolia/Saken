export function MobileTab({ active, onClick, label, badge }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
      {label}
      {badge ? (
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}