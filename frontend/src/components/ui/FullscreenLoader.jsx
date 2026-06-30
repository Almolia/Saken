import { LoaderCircle } from 'lucide-react'

export function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-800 shadow-lg shadow-slate-200/60">
        <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
        <span className="text-sm font-semibold">در حال بارگذاری...</span>
      </div>
    </div>
  )
}