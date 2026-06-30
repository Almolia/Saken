import { Link } from 'react-router-dom'

export function AuthSwitch({ text, href, label }) {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-center text-sm text-slate-600">
      {text}{' '}
      <Link className="font-bold text-teal-700 transition hover:text-teal-800" to={href}>
        {label}
      </Link>
    </div>
  )
}