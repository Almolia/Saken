import { Eye, EyeOff } from 'lucide-react'
import { getPasswordIssues } from '../../lib/validators'

export function PasswordField({ label, name, value, onChange, error, placeholder, showPassword, onToggle, showStrength = false }) {
  const issues = getPasswordIssues(value)
  const hasValue = value.length > 0
  const isStrong = hasValue && issues.length === 0

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`h-12 w-full rounded-2xl border bg-white px-4 pl-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
        />
        <button type="button" onClick={onToggle} className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'مخفی کردن گذرواژه' : 'نمایش گذرواژه'}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && hasValue ? (
        <div className={`mt-3 rounded-2xl px-3 py-2 text-xs font-bold leading-6 ${isStrong ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {isStrong ? 'گذرواژه مناسب است.' : `هنوز کافی نیست؛ ${issues.join('، ')} لازم است.`}
        </div>
      ) : null}
      {error ? <small className="mt-2 block text-xs font-medium text-rose-600">{error}</small> : null}
    </label>
  )
}