import { LoaderCircle } from 'lucide-react'

export function PrimaryButton({ children, loading, type = 'submit', onClick, className = '' }) {
  return (
    <button
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      type={type}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : children}
    </button>
  )
}