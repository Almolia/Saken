import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { ResidentDashboardPageNew } from './ResidentDashboardPage.new'
import { ResidentDashboardPageOld } from './ResidentDashboardPage.old'

export function ResidentDashboardPage({ authState, setAuthState }) {
  const [useNewAppearance, setUseNewAppearance] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setUseNewAppearance((current) => !current)}
        className="fixed left-4 top-1/2 z-50 inline-flex -translate-y-1/2 items-center gap-2 rounded-2xl border border-teal-200 bg-white px-3 py-2 text-xs font-black text-teal-800 shadow-lg shadow-teal-900/10 transition hover:bg-teal-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {useNewAppearance ? 'ظاهر قدیمی' : 'ظاهر جدید'}
      </button>
      {useNewAppearance ? (
        <ResidentDashboardPageNew authState={authState} setAuthState={setAuthState} />
      ) : (
        <ResidentDashboardPageOld authState={authState} setAuthState={setAuthState} />
      )}
    </>
  )
}
