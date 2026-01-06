import { useEffect, useMemo, useRef, useState } from 'react'
import { IconButton } from './IconButton'
import { IconSearch, IconX } from './icons'

export type SearchResult = {
  id: string
  title: string
  subtitle?: string
  kind: string
  to: string
}

export function GlobalSearchDialog(props: {
  open: boolean
  results: SearchResult[]
  onQueryChange: (q: string) => void
  query: string
  onClose: () => void
  onPick: (r: SearchResult) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!props.open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [props.open])

  useEffect(() => {
    setIdx(0)
  }, [props.query, props.open])

  const visible = useMemo(() => props.results.slice(0, 20), [props.results])
  const active = visible[idx] ?? visible[0] ?? null

  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        props.onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => Math.min(visible.length - 1, i + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'Enter' && active) {
        e.preventDefault()
        props.onPick(active)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose, props.onPick, visible.length, active])

  if (!props.open) return null

  return (
    <div className="drawerOverlay" role="dialog" aria-modal="true" aria-label="Global search" onMouseDown={props.onClose}>
      <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panelHeader">
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="navIcon" style={{ width: 28, height: 28 }}>
              <IconSearch />
            </span>
            <div style={{ fontWeight: 650 }}>Search</div>
          </div>
          <IconButton label="Close" onClick={props.onClose}>
            <IconX />
          </IconButton>
        </div>
        <div className="panelBody col" style={{ gap: 10 }}>
          <input
            ref={inputRef}
            className="input"
            placeholder="Search anything… (todos, notes, snippets, diagrams, voice docs, tools)"
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
          />

          <div className="col" style={{ gap: 8, maxHeight: '55vh', overflow: 'auto' }}>
            {visible.length ? (
              visible.map((r, i) => (
                <div
                  key={r.id}
                  className={`listItem ${i === idx ? 'listItemActive' : ''}`.trim()}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => props.onPick(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      props.onPick(r)
                    }
                  }}
                  style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center' }}
                >
                  <span className="pill">{r.kind}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </div>
                    {r.subtitle ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.subtitle}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">No results.</div>
            )}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            ↑/↓ to navigate • Enter to open • Esc to close
          </div>
        </div>
      </div>
    </div>
  )
}


