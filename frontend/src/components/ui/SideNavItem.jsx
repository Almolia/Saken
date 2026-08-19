export function SideNavItem({ icon: Icon, label, active = false, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-white text-slate-950 shadow-lg shadow-black/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-teal-600' : ''}`} />
      <span className="min-w-0 truncate">{label}</span>
      {badge ? (
        <span className={`mr-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${active ? 'bg-teal-600 text-white' : 'bg-white/10 text-slate-200'}`}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}