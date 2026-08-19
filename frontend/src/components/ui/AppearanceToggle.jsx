import { Sparkles, Undo2 } from 'lucide-react'

export function AppearanceToggle({ isNew, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fixed bottom-5 left-4 z-30 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black shadow-2xl transition hover:-translate-y-0.5 ${
        isNew
          ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
          : 'border-teal-400/40 bg-slate-950 text-white hover:bg-slate-800'
      }`}
    >
      {isNew ? <Undo2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-teal-300" />}
      {isNew ? 'ظاهر قدیمی' : 'ظاهر جدید'}
    </button>
  )
}
