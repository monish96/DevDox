import { useEffect, useRef } from 'react'
import type { Todo } from '../lib/types'
import { IconButton } from './IconButton'
import { IconPlus, IconX } from './icons'

export type TodoDraft = {
  title: string
  description: string
  dueDate: string
  tags: string
  priority: NonNullable<Todo['priority']>
}

export function TodoCreateDrawer(props: {
  open: boolean
  heading?: string
  draft: TodoDraft
  onChange: (patch: Partial<TodoDraft>) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!props.open) return
    // Focus after paint
    const t = window.setTimeout(() => titleRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [props.open])

  if (!props.open) return null

  return (
    <div
      className="drawerOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={props.heading ?? 'New todo'}
      onMouseDown={props.onClose}
    >
      <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panelHeader">
          <div style={{ fontWeight: 650 }}>{props.heading ?? 'New Todo'}</div>
          <IconButton label="Close" onClick={props.onClose}>
            <IconX />
          </IconButton>
        </div>
        <div className="panelBody col" style={{ gap: 10 }}>
          <input
            ref={titleRef}
            className="input"
            placeholder="Title"
            value={props.draft.title}
            onChange={(e) => props.onChange({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') props.onSubmit()
              if (e.key === 'Escape') props.onClose()
            }}
          />
          <textarea
            className="input"
            placeholder="Description (optional)"
            value={props.draft.description}
            onChange={(e) => props.onChange({ description: e.target.value })}
            rows={4}
            style={{ resize: 'vertical' }}
          />
          <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
            <input
              className="input"
              type="date"
              value={props.draft.dueDate}
              onChange={(e) => props.onChange({ dueDate: e.target.value })}
              title="Due date"
              style={{ maxWidth: 200 }}
            />
            <select
              className="input"
              value={props.draft.priority}
              onChange={(e) => props.onChange({ priority: e.target.value as TodoDraft['priority'] })}
              title="Priority"
              style={{ maxWidth: 220 }}
            >
              <option value="lowest">Lowest</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </div>
          <input
            className="input"
            placeholder="Tags (comma separated)"
            value={props.draft.tags}
            onChange={(e) => props.onChange({ tags: e.target.value })}
          />
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <IconButton label="Create" kind="primary" onClick={props.onSubmit}>
              <IconPlus />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}


