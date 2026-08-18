import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { isoToJalali, jalaliToIso, toEnglishDigits } from '../../utils/jalaliDate'

function displayValue(iso) {
  const value = isoToJalali(iso)
  return value ? `${value.jy}/${String(value.jm).padStart(2, '0')}/${String(value.jd).padStart(2, '0')}` : ''
}

/** A keyboard-friendly Jalali input. `value`/`onChange` deliberately use Gregorian ISO for API compatibility. */
export function JalaliDateInput({ value, onChange, disabled = false, id, name, className = '', onInvalid }) {
  const [text, setText] = useState(displayValue(value))


  function commit(raw) {
    const normalized = toEnglishDigits(raw).replaceAll('/', '-').trim()
    if (!normalized) { onChange(''); onInvalid?.(''); return }
    // Keep old browser/native-date clients and existing tests functional too.
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(normalized) && Number(normalized.slice(0, 4)) >= 1700
      ? normalized
      : jalaliToIso(normalized)
    if (!iso) { onInvalid?.('تاریخ شمسی معتبر نیست.'); return }
    onInvalid?.('')
    onChange(iso)
    setText(Number(normalized.slice(0, 4)) >= 1700 ? normalized : displayValue(iso))
  }

  function handleChange(event) {
    const raw = event.target.value
    setText(raw)
    // A paste/autofill produces a complete date without a blur before submit.
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(toEnglishDigits(raw).trim())) commit(raw)
  }

  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        dir="ltr"
        placeholder="۱۴۰۵/۰۱/۰۱"
        value={text}
        disabled={disabled}
        onChange={handleChange}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(event.currentTarget.value) } }}
        className={`h-12 w-full rounded-2xl border bg-white py-2 pr-4 pl-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 ${className}`}
      />
    </div>
  )
}
