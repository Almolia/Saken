export function ServerError({ error }) {
  if (!error) return null
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-7 text-rose-700">{error}</div>
}