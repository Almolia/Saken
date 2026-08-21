import { CircleDot, Lock, PencilLine } from 'lucide-react'
import { PollStatus, normalizeStatus, pollStatusLabel, pollStatusTone } from '../../utils/polls'

// A poll's status decides who can see it, so the badge carries an icon as well
// as a colour — the difference between a hidden draft and a live poll must not
// rest on hue alone.
const statusIcons = {
  [PollStatus.DRAFT]: PencilLine,
  [PollStatus.ACTIVE]: CircleDot,
  [PollStatus.CLOSED]: Lock,
}

export function PollStatusBadge({ status, className = '' }) {
  const Icon = statusIcons[normalizeStatus(status)]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${pollStatusTone(status)} ${className}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {pollStatusLabel(status)}
    </span>
  )
}
