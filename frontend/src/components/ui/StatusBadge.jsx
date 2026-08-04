import { CheckCircle2, CircleAlert, Clock3, Wrench } from 'lucide-react'
import { normalizeStatus, RequestStatus } from '../../utils/serviceRequests'

const statusConfig = {
  [RequestStatus.PENDING]: {
    label: 'در انتظار بررسی',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: Clock3,
  },
  [RequestStatus.ASSIGNED]: {
    label: 'ارجاع‌شده',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: Wrench,
  },
  [RequestStatus.COMPLETED]: {
    label: 'تکمیل‌شده',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
  },
}

export function StatusBadge({ status }) {
  const details = statusConfig[normalizeStatus(status)] || {
    label: status || 'نامشخص',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: CircleAlert,
  }
  const Icon = details.icon

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${details.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {details.label}
    </span>
  )
}
