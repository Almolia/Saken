import { BrandMark } from '../ui/BrandMark'

export function AuthCard({ title, description, children, wide = false }) {
  return (
    <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
      <div className="mb-8 flex justify-center">
        <BrandMark />
      </div>
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}