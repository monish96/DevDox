import { IconButton } from './IconButton'
import { IconTrash, IconX } from './icons'

export function ConfirmDialog(props: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!props.open) return null

  return (
    <div
      className="drawerOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
      onMouseDown={props.onCancel}
    >
      <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panelHeader">
          <div style={{ fontWeight: 650 }}>{props.title}</div>
          <IconButton label={props.cancelLabel ?? 'Close'} onClick={props.onCancel}>
            <IconX />
          </IconButton>
        </div>
        <div className="panelBody col" style={{ gap: 10 }}>
          <div className="muted">{props.message}</div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <IconButton label={props.cancelLabel ?? 'Cancel'} onClick={props.onCancel}>
              <IconX />
            </IconButton>
            <IconButton label={props.confirmLabel ?? 'Delete'} kind="danger" onClick={props.onConfirm}>
              <IconTrash />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}


