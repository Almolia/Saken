import { Search } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">کاربری پیدا نشد</h3>
      <p className="mt-2 text-sm text-slate-500">عبارت جستجو را تغییر دهید و دوباره تلاش کنید.</p>
    </div>
  )
}