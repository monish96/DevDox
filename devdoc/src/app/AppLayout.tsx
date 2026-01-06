import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { GlobalSearchDialog, type SearchResult } from '../components/GlobalSearchDialog'
import { TodoCreateDrawer, type TodoDraft } from '../components/TodoCreateDrawer'
import {
  IconChevronLeft,
  IconChevronRight,
  IconDiagram,
  IconDownload,
  IconHome,
  IconMic,
  IconMoon,
  IconNote,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconTodo,
  IconTool,
  IconUpload,
} from '../components/icons'
import { newId } from '../lib/id'
import { setState, useAppState } from '../lib/storage'
import { downloadSession, importSessionFile } from '../lib/sessionFile'
import { applyTheme } from '../lib/theme'
import 'prismjs/themes/prism-tomorrow.css'
import './app.css'

const navItems: Array<{
  to: string
  label: string
  hint?: string
  icon: React.ReactNode
}> = [
  { to: '/', label: 'Dashboard', hint: '⌘1', icon: <IconHome /> },
  { to: '/todos', label: 'Todos', hint: '⌘2', icon: <IconTodo /> },
  { to: '/notes', label: 'Notes & Snippets', hint: '⌘3', icon: <IconNote /> },
  { to: '/diagrams', label: 'Diagrams', hint: '⌘4', icon: <IconDiagram /> },
  { to: '/voice', label: 'Voice Docs', hint: '⌘5', icon: <IconMic /> },
  { to: '/tools', label: 'Dev Tools', hint: '⌘6', icon: <IconTool /> },
  { to: '/settings', label: 'Settings', hint: '⌘7', icon: <IconSettings /> },
]

function titleForPath(pathname: string): string {
  const found = navItems.find((n) => n.to === pathname)
  return found?.label ?? 'DevDox'
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const userName = useAppState((s) => s.userName)
  const backupEnabled = useAppState((s) => s.backupEnabled)
  const backupIntervalHours = useAppState((s) => s.backupIntervalHours)
  const backupLastAt = useAppState((s) => s.backupLastAt)
  const searchShortcutEnabled = useAppState((s) => s.searchShortcutEnabled)
  const todos = useAppState((s) => s.todos)
  const notes = useAppState((s) => s.notes)
  const snippets = useAppState((s) => s.snippets)
  const voiceDocs = useAppState((s) => s.voiceDocs)
  const diagrams = useAppState((s) => s.diagrams)

  const shortcutHint = useMemo(() => (isMac() ? '⌘' : 'Ctrl'), [])
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('devdox:sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const [quickTodoOpen, setQuickTodoOpen] = useState(false)
  const [quickDraft, setQuickDraft] = useState<TodoDraft>({
    title: '',
    description: '',
    dueDate: '',
    tags: '',
    priority: 'medium',
  })

  const [nameOpen, setNameOpen] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [backupDue, setBackupDue] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const sidebarImportRef = useRef<HTMLInputElement | null>(null)
  const welcomeImportRef = useRef<HTMLInputElement | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (userName && userName.trim()) return
    setNameOpen(true)
  }, [userName])

  useEffect(() => {
    if (!backupEnabled) {
      setBackupDue(false)
      return
    }
    const intervalMs = Math.max(1, backupIntervalHours ?? 24) * 60 * 60 * 1000
    const now = Date.now()
    const due = !backupLastAt || now - backupLastAt >= intervalMs
    setBackupDue(due)
    const t = window.setInterval(() => {
      const sNow = Date.now()
      const sDue = !backupLastAt || sNow - backupLastAt >= intervalMs
      setBackupDue(sDue)
    }, 60_000)
    return () => window.clearInterval(t)
  }, [backupEnabled, backupIntervalHours, backupLastAt])

  function saveName() {
    const name = nameValue.trim()
    if (!name) return
    setState((prev) => ({ ...prev, userName: name }))
    setNameOpen(false)
  }

  async function onImportFile(file: File) {
    setImporting(true)
    setImportError(null)
    try {
      await importSessionFile(file)
      setNameOpen(false)
      navigate('/')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.'
      setImportError(msg)
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = isMac() ? e.metaKey : e.ctrlKey
      if (!isCmdOrCtrl) return
      if (e.altKey) return
      if (e.shiftKey) return
      if (isEditableTarget(e.target)) return

      const idx = shortcutIndex(e)
      if (idx == null) return
      const item = navItems[idx]
      if (!item) return

      e.preventDefault()
      navigate(item.to)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = isMac() ? e.metaKey : e.ctrlKey
      if (!isCmdOrCtrl) return
      if (!searchShortcutEnabled) return
      if (e.shiftKey) return
      if (e.altKey) return
      if (isEditableTarget(e.target)) return
      const isK = e.code === 'KeyK' || (e.key || '').toLowerCase() === 'k'
      if (!isK) return
      e.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchShortcutEnabled])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdOrCtrl = isMac() ? e.metaKey : e.ctrlKey
      if (!isCmdOrCtrl) return
      // Quick add todo: Cmd/Ctrl + Alt + T (and also Cmd/Ctrl + Alt + Shift + T)
      if (!e.altKey) return
      if (isEditableTarget(e.target)) return
      // Ctrl/Cmd + Alt/Option + T => Quick add todo
      // Use `code` so Option+T (which can produce non-"t" characters) still works.
      const isT = e.code === 'KeyT' || (e.key || '').toLowerCase() === 't'
      if (!isT) return
      e.preventDefault()
      setQuickTodoOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!quickTodoOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickTodoOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [quickTodoOpen])

  function saveQuickTodo() {
    const title = quickDraft.title.trim()
    if (!title) return
    const now = Date.now()
    setState((prev) => ({
      ...prev,
      todos: [
        {
          id: newId('todo'),
          title,
          columnId: (prev.todoColumns?.find((c) => c.title.toLowerCase() === 'todo')?.id ?? prev.todoColumns?.[0]?.id),
          dueDate: quickDraft.dueDate.trim() || undefined,
          description: quickDraft.description.trim() || '',
          tags: quickDraft.tags
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 10),
          priority: quickDraft.priority ?? 'medium',
          createdAt: now,
          updatedAt: now,
        },
        ...prev.todos,
      ],
    }))
    setQuickDraft({ title: '', description: '', dueDate: '', tags: '', priority: 'medium' })
    setQuickTodoOpen(false)
    navigate('/todos')
  }

  const searchResults: SearchResult[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const res: SearchResult[] = []

    const add = (r: SearchResult) => res.push(r)
    const matchScore = (text: string) => {
      const t = text.toLowerCase()
      if (!q) return 999
      if (t === q) return 0
      if (t.startsWith(q)) return 1
      const idx = t.indexOf(q)
      if (idx >= 0) return 2 + Math.min(30, idx)
      return 999
    }

    // Pages
    for (const n of navItems) {
      const s = q ? matchScore(n.label) : 999
      if (!q || s < 999) add({ id: `page:${n.to}`, kind: 'page', title: n.label, subtitle: n.to, to: n.to })
    }

    // Tools anchors
    const tools: Array<{ id: string; title: string; hash: string }> = [
      { id: 'tool:base64', title: 'Base64', hash: '#base64' },
      { id: 'tool:json', title: 'JSON Formatter', hash: '#json' },
      { id: 'tool:uuid', title: 'UUID', hash: '#uuid' },
      { id: 'tool:url', title: 'URL Encode/Decode', hash: '#url' },
      { id: 'tool:sha', title: 'SHA-256', hash: '#sha256' },
    ]
    for (const t of tools) {
      const s = q ? matchScore(t.title) : 999
      if (!q || s < 999) add({ id: t.id, kind: 'tool', title: t.title, subtitle: 'Dev Tools', to: `/tools${t.hash}` })
    }

    // Todos
    for (const t of todos) {
      if (t.archivedAt) continue
      const hay = `${t.title} ${(t.description ?? '')} ${(t.tags ?? []).join(' ')}`
      const s = q ? matchScore(hay) : 999
      if (!q || s < 999) add({ id: `todo:${t.id}`, kind: 'todo', title: t.title, subtitle: t.dueDate ? `Due ${t.dueDate}` : 'No due date', to: `/todos?todoId=${encodeURIComponent(t.id)}` })
    }

    // Notes
    for (const n of notes) {
      if (n.archivedAt) continue
      const hay = `${n.title} ${n.body ?? ''}`
      const s = q ? matchScore(hay) : 999
      if (!q || s < 999) add({ id: `note:${n.id}`, kind: 'note', title: n.title, subtitle: 'Notes', to: `/notes?noteId=${encodeURIComponent(n.id)}` })
    }

    // Snippets
    for (const s0 of snippets) {
      if (s0.archivedAt) continue
      const hay = `${s0.title} ${s0.language} ${s0.tags?.join(' ') ?? ''} ${s0.code ?? ''}`
      const s = q ? matchScore(hay) : 999
      if (!q || s < 999) add({ id: `snippet:${s0.id}`, kind: 'snippet', title: s0.title, subtitle: s0.language, to: `/notes?snippetId=${encodeURIComponent(s0.id)}` })
    }

    // Voice docs
    for (const v of voiceDocs) {
      if (v.archivedAt) continue
      const hay = `${v.title} ${v.summary ?? ''} ${v.rawText ?? ''}`
      const s = q ? matchScore(hay) : 999
      if (!q || s < 999) add({ id: `voice:${v.id}`, kind: 'voice', title: v.title, subtitle: 'Voice Docs', to: `/voice?voiceId=${encodeURIComponent(v.id)}` })
    }

    // Diagrams
    for (const d of diagrams) {
      if (d.archivedAt) continue
      const hay = `${d.title}`
      const s = q ? matchScore(hay) : 999
      if (!q || s < 999) add({ id: `diagram:${d.id}`, kind: 'diagram', title: d.title, subtitle: 'Diagrams', to: `/diagrams?diagramId=${encodeURIComponent(d.id)}` })
    }

    if (!q) return res.slice(0, 25)
    // Basic ranking by best score (computed against title-ish strings)
    return res
      .map((r) => ({ r, s: matchScore(`${r.title} ${r.subtitle ?? ''} ${r.kind}`) }))
      .sort((a, b) => a.s - b.s)
      .map((x) => x.r)
      .slice(0, 25)
  }, [diagrams, notes, searchQuery, snippets, todos, voiceDocs])

  return (
    <div className={`appShell ${collapsed ? 'appShellCollapsed' : ''}`.trim()}>
      <aside className={`sidebar ${collapsed ? 'sidebarCollapsed' : ''}`.trim()}>
        <div className="brand">
          <div className="sidebarTopRow">
            <div className="brandTitle">DevDox</div>
          </div>
          <div className={`brandTag ${collapsed ? 'hideWhenCollapsed' : ''}`.trim()}>
            Your local-first dev cockpit — capture work, ship faster.
          </div>
        </div>

        <nav className={`nav ${collapsed ? 'navCollapsed' : ''}`.trim()}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `navLink ${isActive ? 'navLinkActive' : ''}`.trim()
              }
            >
              <span className="navLinkLeft">
                <span className="navIcon">{item.icon}</span>
                <span className="navLabel">{item.label}</span>
              </span>
              {item.hint ? <span className="kbdHint">{shortcutHint}{item.hint.replace('⌘', '')}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 16 }} className={`muted ${collapsed ? 'hideWhenCollapsed' : ''}`.trim()}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span>
              Data stays in your browser (<code>localStorage</code>).
            </span>
            <div className="row" style={{ gap: 6 }}>
              <IconButton
                label={backupDue ? 'Backup due: download session' : 'Download session'}
                kind={backupDue ? 'primary' : 'default'}
                onClick={() => {
                  downloadSession()
                  setState((prev) => ({ ...prev, backupLastAt: Date.now() }))
                }}
              >
                <IconDownload />
              </IconButton>
              <input
                ref={sidebarImportRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.currentTarget.value = ''
                  if (!f) return
                  void onImportFile(f)
                }}
              />
              <IconButton
                label="Import session"
                onClick={() => {
                  sidebarImportRef.current?.click()
                }}
              >
                <IconUpload />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="sidebarBottom">
          <div className="sidebarBottomRow">
            <img
              src="/devdox.svg"
              alt="DevDox"
              title="DevDox"
              className="sidebarBottomIcon"
              style={{ opacity: collapsed ? 0.98 : 0.9 }}
            />
            <button
              type="button"
              className="sidebarToggle"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => {
                const next = !collapsed
                setCollapsed(next)
                try {
                  localStorage.setItem('devdox:sidebar', next ? 'collapsed' : 'expanded')
                } catch {
                  // ignore
                }
              }}
            >
              {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="topbar">
          <div className="topbarTitle">{titleForPath(location.pathname)}</div>
          <div className="row" style={{ gap: 8 }}>
            <IconButton label="Search (Ctrl/Cmd+K)" onClick={() => setSearchOpen(true)}>
              <IconSearch />
            </IconButton>
            <IconButton label="Quick add todo (Ctrl/Cmd+Alt+T)" onClick={() => setQuickTodoOpen(true)}>
              <IconPlus />
            </IconButton>
            <IconButton
              label="Toggle theme"
              onClick={() => {
                const next = theme === 'light' ? 'dark' : 'light'
                applyTheme(next)
                setTheme(next)
              }}
            >
              {theme === 'light' ? <IconMoon /> : <IconSun />}
            </IconButton>
            {userName ? <div className="kbdHint">Hi, <strong>{userName}</strong></div> : null}
          </div>
        </div>
        <Outlet />
      </main>

      <TodoCreateDrawer
        open={quickTodoOpen}
        heading="New Todo"
        draft={quickDraft}
        onChange={(patch) => setQuickDraft((d) => ({ ...d, ...patch }))}
        onClose={() => setQuickTodoOpen(false)}
        onSubmit={saveQuickTodo}
      />

      <GlobalSearchDialog
        open={searchOpen}
        query={searchQuery}
        results={searchResults}
        onQueryChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onPick={(r) => {
          setSearchOpen(false)
          setSearchQuery('')
          navigate(r.to)
        }}
      />

      {nameOpen ? (
        <div
          className="drawerOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Set your name"
          onMouseDown={() => {
            // keep it sticky until saved
          }}
        >
          <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="panelHeader">
              <div style={{ fontWeight: 650 }}>Welcome to DevDox</div>
            </div>
            <div className="panelBody col" style={{ gap: 10 }}>
              <div className="muted">Restore a previous session (drag & drop), or start fresh.</div>

              <input
                ref={welcomeImportRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.currentTarget.value = ''
                  if (!f) return
                  void onImportFile(f)
                }}
              />

              <div
                className={`dropZone ${dragOver ? 'dropZoneActive' : ''}`.trim()}
                role="button"
                tabIndex={0}
                aria-label="Import DevDox session"
                onClick={() => welcomeImportRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') welcomeImportRef.current?.click()
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (!f) return
                  void onImportFile(f)
                }}
              >
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <div className="navIcon" style={{ width: 34, height: 34 }}>
                    <IconUpload />
                  </div>
                  <div className="col" style={{ gap: 2 }}>
                    <div style={{ fontWeight: 700 }}>Drop your session JSON here</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      or click to browse • {importing ? 'importing…' : 'restores instantly'}
                    </div>
                  </div>
                </div>
              </div>

              {importError ? <div className="pill pillBad">{importError}</div> : null}

              <div className="divider" />

              <div className="muted">Set your name (shown in the top bar).</div>
              <input
                className="input"
                placeholder="Your name"
                value={nameValue}
                autoFocus
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                }}
              />
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <IconButton label="Save" kind="primary" onClick={saveName}>
                  <IconPlus />
                </IconButton>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Saved locally in <code>localStorage</code>.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function shortcutIndex(e: KeyboardEvent): number | null {
  // Support top-row digits + numpad digits.
  const code = e.code
  if (code.startsWith('Digit')) {
    const n = Number(code.slice('Digit'.length))
    return Number.isFinite(n) ? n - 1 : null
  }
  if (code.startsWith('Numpad')) {
    const n = Number(code.slice('Numpad'.length))
    return Number.isFinite(n) ? n - 1 : null
  }
  // Fallback to e.key when code isn't reliable (IME/layouts).
  const k = Number(e.key)
  return Number.isFinite(k) ? k - 1 : null
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

function isMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}


