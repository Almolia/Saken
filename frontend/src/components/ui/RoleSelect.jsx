import { ChevronDown, LoaderCircle } from 'lucide-react'
import { assignableRoles, roleLabels } from '../../utils/constants'

export function RoleSelect({ value, onChange, disabled = false, loading = false, label, title }) {
  const locked = disabled || loading

  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={locked}
        aria-label={label}
        title={title}
        className="h-10 appearance-none rounded-2xl border border-slate-200 bg-white pr-4 pl-10 text-xs font-bold text-slate-800 shadow-sm outline-none transition hover:bg-slate-50 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100"
      >
        {assignableRoles.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
      </span>
    </div>
  )
}
