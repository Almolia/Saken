import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:left-6 sm:top-6">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success'
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
                isSuccess
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50'
                  : 'border-rose-400/20 bg-rose-500/10 text-rose-50'
              }`}
            >
              <div className={`mt-0.5 rounded-full p-1 ${isSuccess ? 'bg-emerald-400/15' : 'bg-rose-400/15'}`}>
                {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
              </div>
              <div className="flex-1 leading-7">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
