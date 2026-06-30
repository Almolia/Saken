import { LoaderCircle } from 'lucide-react'

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm font-bold text-slate-500">
      <LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />
      در حال بارگذاری...
    </div>
  )
}