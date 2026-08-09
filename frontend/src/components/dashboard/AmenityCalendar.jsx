import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const MONTH_NAMES = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
]

const WEEKDAY_NAMES = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']

function formatDateISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function AmenityCalendar({ selectedDate, onSelectDate }) {
  const today = new Date()
  const todayISO = formatDateISO(today)

  const initialDate = selectedDate ? new Date(selectedDate) : today
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function handleQuickDate(offsetDays) {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const iso = formatDateISO(d)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    onSelectDate(iso)
  }

  // Generate days for calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sunday, 6 = Saturday

  const emptyCells = Array.from({ length: firstDayOfWeek })
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-teal-600" />
          <span className="text-sm font-black text-slate-900">انتخاب تاریخ رزرو</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleQuickDate(0)}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
              selectedDate === todayISO
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(1)}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
              selectedDate === formatDateISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            فردا
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(2)}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
              selectedDate === formatDateISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2))
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            پس‌فردا
          </button>
          <div className="ml-1 flex items-center gap-1">
            <input
              type="date"
              aria-label="انتخاب تاریخ"
              value={selectedDate || ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-').map(Number)
                  if (y && m) {
                    setViewYear(y)
                    setViewMonth(m - 1)
                  }
                  onSelectDate(e.target.value)
                }
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-extrabold text-slate-800">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              title="ماه قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              title="ماه بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1">
          {WEEKDAY_NAMES.map((name, i) => (
            <div key={i} className="py-1">
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}
          {dayCells.map((day) => {
            const cellDate = new Date(viewYear, viewMonth, day)
            const cellISO = formatDateISO(cellDate)
            const isSelected = selectedDate === cellISO
            const isToday = todayISO === cellISO
            const isPast = cellISO < todayISO

            return (
              <button
                key={day}
                type="button"
                onClick={() => !isPast && onSelectDate(cellISO)}
                disabled={isPast}
                aria-label={`روز ${day}`}
                className={`flex h-9 flex-col items-center justify-center rounded-xl text-xs font-extrabold transition ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                    : isToday
                      ? 'border-2 border-teal-500 text-teal-700 bg-teal-50/50'
                      : isPast
                        ? 'cursor-not-allowed text-slate-300 bg-slate-50 opacity-50'
                        : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
