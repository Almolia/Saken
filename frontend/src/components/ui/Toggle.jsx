import { Check, LoaderCircle, X } from 'lucide-react'

export function Toggle({ checked, onChange, disabled = false, label = '', ariaLabel, loading = false, title }) {
  const locked = disabled || loading

  return (
    <label className="relative inline-flex cursor-pointer items-center gap-3">
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || undefined}
        title={title}
        disabled={locked}
        onClick={() => !locked && onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          checked ? 'bg-emerald-500' : 'bg-slate-300'
        } ${locked ? 'opacity-60' : ''}`}
      >
        <span
          className={`flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        >
          {loading ? (
            <LoaderCircle className="h-3 w-3 animate-spin text-slate-400" />
          ) : checked ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <X className="h-3 w-3 text-slate-400" />
          )}
        </span>
      </button>
    </label>
  )
}
