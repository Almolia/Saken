export function SideNavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-white text-slate-950 shadow-lg shadow-black/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
      <Icon className={`h-5 w-5 ${active ? 'text-teal-600' : ''}`} />
      <span>{label}</span>
    </button>
  )
}