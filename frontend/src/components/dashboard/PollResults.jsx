import { BarChart3, CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function PollResults({ pollId, fetchResults, title = 'نتایج نظرسنجی' }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const load = useCallback(() => {
    setState({ loading: true, error: '', data: null })
    fetchResults(pollId).then((data) => setState({ loading: false, error: '', data }))
      .catch((error) => setState({ loading: false, error: error.message || 'دریافت نتایج ناموفق بود.', data: null }))
  }, [fetchResults, pollId])

  // This effect intentionally triggers a data fetch on mount / poll change.
  // The setState inside load() is expected and safe here - it reflects async data.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  if (state.loading) return <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-teal-600" />در حال دریافت نتایج...</div>
  if (state.error) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700" role="alert"><p className="flex items-center gap-2 font-bold"><CircleAlert className="h-5 w-5" />{state.error}</p><button onClick={load} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4" />تلاش مجدد</button></div>
  const data = state.data || { options: [], total_votes: 0 }
  return <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" aria-label={title}>
    <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-teal-600" /><h4 className="font-black text-slate-900">{title}</h4><span className="mr-auto text-xs text-slate-500">{data.total_votes} رأی</span></div>
    {data.options.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">هنوز گزینه‌ای برای نمایش وجود ندارد.</p> : <div className="space-y-4">{data.options.map((option) => <div key={option.id}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-bold text-slate-700">{option.text}</span><span className="shrink-0 font-black text-slate-500">{option.vote_count} رأی، {option.percentage}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, option.percentage))}%` }} /></div></div>)}</div>}
  </section>
}
