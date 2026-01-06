import type { ReactNode } from 'react'

export function IconButton(props: {
  label: string
  onClick?: () => void
  disabled?: boolean
  kind?: 'default' | 'primary' | 'danger'
  children: ReactNode
}) {
  const kind = props.kind ?? 'default'
  const cls =
    kind === 'primary'
      ? 'iconBtn iconBtnPrimary'
      : kind === 'danger'
        ? 'iconBtn iconBtnDanger'
        : 'iconBtn'

  return (
    <button
      type="button"
      className={cls}
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}


