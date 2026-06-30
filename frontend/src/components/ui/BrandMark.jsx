import { Shield } from 'lucide-react'

export function BrandMark({ dark = false, compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center rounded-2xl ${compact ? 'h-11 w-11' : 'h-14 w-14'} ${dark ? 'bg-white/10 text-teal-200 ring-1 ring-white/15' : 'bg-slate-900 text-teal-300 shadow-lg shadow-slate-300/50'}`}>
        <Shield className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
      </div>
      <div>
        <div className={`${compact ? 'text-xl' : 'text-2xl'} font-black tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>سامانه ساکن</div>
        <div className={`mt-0.5 text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>مدیریت مجتمع مسکونی</div>
      </div>
    </div>
  )
}