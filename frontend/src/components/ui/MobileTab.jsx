export function MobileTab({ active, onClick, label }) {
  return (
    <button type="button" onClick={onClick} className={`h-10 rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
      {label}
    </button>
  )
}