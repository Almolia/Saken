import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatIsoDate, gregorianToJalali, isoToJalali, jalaliMonthLength, jalaliToGregorian } from '../../utils/jalaliDate'

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const WEEKDAY_NAMES = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function isoForJalali(year, month, day) {
  const { gy, gm, gd } = jalaliToGregorian(year, month, day)
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

export function AmenityCalendar({ selectedDate, onSelectDate }) {
  const today = new Date()
  const todayISO = formatIsoDate(today)
  const initial = isoToJalali(selectedDate || todayISO) || gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const [view, setView] = useState({ year: initial.jy, month: initial.jm })

  function moveMonth(delta) {
    setView(({ year, month }) => {
      const next = month + delta
      return next < 1 ? { year: year - 1, month: 12 } : next > 12 ? { year: year + 1, month: 1 } : { year, month: next }
    })
  }
  function selectRelative(days) {
    const date = new Date(); date.setDate(date.getDate() + days)
    const iso = formatIsoDate(date); const jalali = isoToJalali(iso)
    setView({ year: jalali.jy, month: jalali.jm }); onSelectDate(iso)
  }

  const firstGregorian = jalaliToGregorian(view.year, view.month, 1)
  const firstDay = new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd).getDay()
  // JS Saturday=6; the grid is Saturday-first.
  const emptyCells = Array.from({ length: (firstDay + 1) % 7 })
  const days = Array.from({ length: jalaliMonthLength(view.year, view.month) }, (_, index) => index + 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-teal-600" /><span className="text-sm font-black text-slate-900">انتخاب تاریخ رزرو</span></div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[['امروز', 0], ['فردا', 1], ['پس‌فردا', 2]].map(([label, offset]) => {
            const date = new Date(); date.setDate(date.getDate() + offset); const iso = formatIsoDate(date)
            return <button key={offset} type="button" onClick={() => selectRelative(offset)} className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${selectedDate === iso ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
          })}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between px-1"><span className="text-xs font-extrabold text-slate-800">{MONTH_NAMES[view.month - 1]} {view.year}</span><div className="flex gap-1"><button type="button" onClick={() => moveMonth(-1)} aria-label="ماه قبل" className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200"><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => moveMonth(1)} aria-label="ماه بعد" className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200"><ChevronLeft className="h-4 w-4" /></button></div></div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">{WEEKDAY_NAMES.map((name) => <div key={name} className="py-1">{name}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{emptyCells.map((_, i) => <div key={i} className="h-9" />)}{days.map((day) => {
          const iso = isoForJalali(view.year, view.month, day); const past = iso < todayISO
          const selected = selectedDate === iso; const isToday = todayISO === iso
          return <button key={day} type="button" aria-label={`روز ${day}`} disabled={past} onClick={() => onSelectDate(iso)} className={`flex h-9 items-center justify-center rounded-xl text-xs font-extrabold transition ${selected ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30' : isToday ? 'border-2 border-teal-500 bg-teal-50/50 text-teal-700' : past ? 'cursor-not-allowed bg-slate-50 text-slate-300 opacity-50' : 'text-slate-800 hover:bg-slate-100'}`}>{day}</button>
        })}</div>
      </div>
    </div>
  )
}
