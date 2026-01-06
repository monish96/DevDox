import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { IconPause, IconPlay, IconX } from '../components/icons'
import { PomodoroClock } from '../components/PomodoroClock'
import { useAppState } from '../lib/storage'

export function DashboardPage() {
  const todos = useAppState((s) => s.todos)
  const columns = useAppState((s) => s.todoColumns)
  const notes = useAppState((s) => s.notes)
  const snippets = useAppState((s) => s.snippets)
  const voiceDocs = useAppState((s) => s.voiceDocs)
  const focusMinutes = useAppState((s) => s.pomodoroFocusMinutes) ?? 30

  const focusMs = useMemo(() => Math.max(5, Math.min(180, focusMinutes)) * 60_000, [focusMinutes])
  const [running, setRunning] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState<number>(focusMs)
  const lastConfiguredMsRef = useRef<number>(focusMs)

  useEffect(() => {
    // If user changes focus length, update the timer ONLY if it's not in progress.
    // "Not in progress" = not running AND not paused (endAt === null) AND still at the previous default.
    const prev = lastConfiguredMsRef.current
    if (focusMs === prev) return
    lastConfiguredMsRef.current = focusMs
    if (!running && endAt === null && remainingMs === prev) {
      setRemainingMs(focusMs)
    }
  }, [focusMs, running, endAt, remainingMs])

  useEffect(() => {
    if (!running || !endAt) return
    const t = window.setInterval(() => {
      const left = Math.max(0, endAt - Date.now())
      setRemainingMs(left)
      if (left <= 0) {
        setRunning(false)
      }
    }, 250)
    return () => window.clearInterval(t)
  }, [running, endAt])

  const doingColumnIds = new Set(columns.filter((c) => c.title.toLowerCase() === 'doing').map((c) => c.id))
  const doneColumnIds = new Set(columns.filter((c) => c.title.toLowerCase() === 'done').map((c) => c.id))

  const activeTodos = todos.filter((t) => !t.archivedAt)
  const doing = activeTodos.filter((t) => (t.columnId ? doingColumnIds.has(t.columnId) : t.status === 'doing'))
  const overdue = activeTodos.filter((t) => {
    const isDone = t.columnId ? doneColumnIds.has(t.columnId) : t.status === 'done'
    return !isDone && !!t.dueDate && t.dueDate < today()
  })

  return (
    <div className="container col">
      <div className="grid2">
        <div className="panel">
          <div className="panelHeader">
            <div style={{ fontWeight: 650 }}>Quick stats</div>
            <span className="pill">local</span>
          </div>
          <div className="panelBody col">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Todos</span>
              <strong>{todos.length}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Notes</span>
              <strong>{notes.length}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Snippets</span>
              <strong>{snippets.length}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Voice docs</span>
              <strong>{voiceDocs.length}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div style={{ fontWeight: 650 }}>Pomodoro</div>
            <span className="pill">{focusMinutes}m</span>
          </div>
          <div className="panelBody col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <PomodoroClock
                remainingMs={remainingMs}
                totalMs={focusMs}
                isLight={document.documentElement.dataset.theme === 'light'}
                showSecondHand={running}
              />
              <div className="col" style={{ gap: 10, minWidth: 180, flex: 1 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: 0.3 }}>{formatMs(remainingMs)}</div>
                  {remainingMs <= 0 ? (
                    <span className="pill pillGood">done</span>
                  ) : running ? (
                    <span className="pill pillWarn">focus</span>
                  ) : (
                    <span className="pill">ready</span>
                  )}
                </div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {running ? (
                    <IconButton
                      label="Pause"
                      kind="primary"
                      onClick={() => {
                        // Freeze remaining time instead of resetting.
                        if (endAt) setRemainingMs(Math.max(0, endAt - Date.now()))
                        setRunning(false)
                        setEndAt(null)
                      }}
                    >
                      <IconPause />
                    </IconButton>
                  ) : (
                    <IconButton
                      label={remainingMs <= 0 || remainingMs === focusMs ? 'Start' : 'Resume'}
                      kind="primary"
                      onClick={() => {
                        const now = Date.now()
                        const base = remainingMs > 0 ? remainingMs : focusMs
                        setRemainingMs(base)
                        setEndAt(now + base)
                        setRunning(true)
                      }}
                    >
                      <IconPlay />
                    </IconButton>
                  )}
                  <IconButton
                    label="Reset"
                    onClick={() => {
                      setRunning(false)
                      setEndAt(null)
                      setRemainingMs(focusMs)
                    }}
                  >
                    <IconX />
                  </IconButton>
                </div>
                <span className="muted">
                  Configure in <Link to="/settings">Settings</Link>.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div style={{ fontWeight: 650 }}>Today</div>
            {overdue.length ? <span className="pill pillBad">{overdue.length} overdue</span> : null}
          </div>
          <div className="panelBody col">
            {doing.length ? (
              <div>
                <div className="muted" style={{ marginBottom: 8 }}>
                  Current working things
                </div>
                <div className="col" style={{ gap: 8 }}>
                  {doing.slice(0, 6).map((t) => (
                    <div key={t.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                      {t.dueDate ? <span className="pill">{t.dueDate}</span> : <span className="pill">no due</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="muted">
                Nothing marked <strong>Doing</strong> yet. Head to <Link to="/todos">Todos</Link>.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 650 }}>Quick actions</div>
        </div>
        <div className="panelBody row" style={{ flexWrap: 'wrap' }}>
          <Link className="btn btnPrimary" to="/todos">
            Add a todo
          </Link>
          <Link className="btn" to="/notes">
            Create a note / snippet
          </Link>
          <Link className="btn" to="/voice">
            Dictate + summarize docs
          </Link>
          <Link className="btn" to="/tools">
            Use dev tools
          </Link>
        </div>
      </div>
    </div>
  )
}

function today(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}


