import { roleLabels } from '../../utils/constants'

export function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-slate-950 text-white',
    manager: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    resident: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  }
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles[role]}`}>{roleLabels[role]}</span>
}