import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let bodyScrollLockCount = 0
let bodyOverflowBeforeLock = ''
const openModalStack = []

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLockCount += 1
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = bodyOverflowBeforeLock
    bodyOverflowBeforeLock = ''
  }
}

function focusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  )
}

const modalSizeClass = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
}

export function Modal({
  open,
  title,
  description = '',
  onClose,
  children,
  loading = false,
  closeOnBackdrop = true,
  size = 'md',
}) {
  const dialogRef = useRef(null)
  const instanceRef = useRef(Symbol('modal'))
  const onCloseRef = useRef(onClose)
  const loadingRef = useRef(loading)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    if (!open) return undefined

    const instance = instanceRef.current
    const previouslyFocused = document.activeElement
    openModalStack.push(instance)
    lockBodyScroll()

    const dialog = dialogRef.current
    const firstFocusable = dialog ? focusableElements(dialog)[0] : null
    ;(firstFocusable ?? dialog)?.focus()

    function handleKeyDown(event) {
      if (openModalStack.at(-1) !== instance) return

      if (event.key === 'Escape') {
        if (!loadingRef.current) {
          event.preventDefault()
          onCloseRef.current?.()
        }
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const elements = focusableElements(dialogRef.current)
      if (elements.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === first || !dialogRef.current.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !dialogRef.current.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const stackIndex = openModalStack.lastIndexOf(instance)
      if (stackIndex !== -1) openModalStack.splice(stackIndex, 1)
      unlockBodyScroll()

      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  if (!open) return null

  const canClose = !loading

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        data-testid="modal-backdrop"
        onClick={() => {
          if (closeOnBackdrop && canClose) onClose?.()
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${modalSizeClass[size] || modalSizeClass.md} max-h-[90vh] overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-400/30 sm:p-7`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 id={titleId} className="text-xl font-black tracking-tight text-slate-950">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-7 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!canClose}
            aria-label="بستن"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
