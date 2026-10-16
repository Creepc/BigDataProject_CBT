import { useEffect, useRef, type RefObject } from 'react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export const useDialogFocus = (
  active: boolean,
  dialogRef: RefObject<HTMLElement>,
  initialFocusRef: RefObject<HTMLElement>,
  backgroundRef: RefObject<HTMLElement>,
  onClose: () => void,
) => {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return

    const dialog = dialogRef.current
    const background = backgroundRef.current
    const nativeDialog = dialog instanceof HTMLDialogElement ? dialog : null
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const previousAriaHidden = background?.getAttribute('aria-hidden')
    const hadInert = background?.hasAttribute('inert') ?? false

    document.body.style.overflow = 'hidden'
    background?.setAttribute('aria-hidden', 'true')
    background?.setAttribute('inert', '')
    if (nativeDialog && !nativeDialog.open) nativeDialog.showModal()
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    ;(initialFocusRef.current ?? focusables()[0] ?? dialog)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (!hadInert) background?.removeAttribute('inert')
      if (previousAriaHidden === null || previousAriaHidden === undefined) background?.removeAttribute('aria-hidden')
      else background?.setAttribute('aria-hidden', previousAriaHidden)
      if (nativeDialog?.open) nativeDialog.close()
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [active, backgroundRef, dialogRef, initialFocusRef])
}
