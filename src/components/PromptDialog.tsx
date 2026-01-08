import { useEffect, useRef } from 'react'
import { IconButton } from './IconButton'
import { IconSave, IconX } from './icons'

export function PromptDialog(props: {
  open: boolean
  title: string
  message?: string
  value: string
  placeholder?: string
  inputLabel?: string
  error?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  min?: number
  max?: number
  step?: number
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!props.open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [props.open])

  if (!props.open) return null

  return (
    <div className="drawerOverlay" role="dialog" aria-modal="true" aria-label={props.title} onMouseDown={props.onCancel}>
      <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panelHeader">
          <div style={{ fontWeight: 650 }}>{props.title}</div>
          <IconButton label={props.cancelLabel ?? 'Close'} onClick={props.onCancel}>
            <IconX />
          </IconButton>
        </div>

        <div className="panelBody col" style={{ gap: 10 }}>
          {props.message ? <div className="muted">{props.message}</div> : null}

          <div className="col" style={{ gap: 6 }}>
            {props.inputLabel ? (
              <div className="muted" style={{ fontSize: 12 }}>
                {props.inputLabel}
              </div>
            ) : null}
            <input
              ref={inputRef}
              className="input"
              type="number"
              min={props.min}
              max={props.max}
              step={props.step}
              placeholder={props.placeholder}
              value={props.value}
              onChange={(e) => props.onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  props.onCancel()
                }
                if (e.key === 'Enter' && !props.confirmDisabled) {
                  e.preventDefault()
                  props.onConfirm()
                }
              }}
            />
            {props.error ? <div className="pill pillBad">{props.error}</div> : null}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <IconButton label={props.cancelLabel ?? 'Cancel'} onClick={props.onCancel}>
              <IconX />
            </IconButton>
            <IconButton
              label={props.confirmLabel ?? 'Save'}
              kind="primary"
              onClick={props.onConfirm}
              disabled={props.confirmDisabled}
            >
              <IconSave />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}




