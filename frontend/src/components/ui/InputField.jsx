export function InputField({ label, name, type, value, onChange, error, placeholder, optional = false, helper = '' }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
        {label}
        {optional ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">اختیاری</span> : null}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : 'off'}
        className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
      />
      {helper && !error ? <small className="mt-2 block text-xs font-medium leading-6 text-slate-500">{helper}</small> : null}
      {error ? <small className="mt-2 block text-xs font-medium text-rose-600">{error}</small> : null}
    </label>
  )
}