import { useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconButton } from '../components/IconButton'
import { PromptDialog } from '../components/PromptDialog'
import { IconDownload, IconEdit, IconKanban, IconList, IconPlus, IconSave, IconTrash, IconUpload } from '../components/icons'
import { newId } from '../lib/id'
import { setState, useAppState } from '../lib/storage'
import { downloadSession, importSessionFile } from '../lib/sessionFile'
import type { TodoColumn } from '../lib/types'

export function SettingsPage() {
  const columns = useAppState((s) => s.todoColumns)
  const todos = useAppState((s) => s.todos)
  const backupEnabled = useAppState((s) => s.backupEnabled)
  const backupIntervalHours = useAppState((s) => s.backupIntervalHours)
  const backupLastAt = useAppState((s) => s.backupLastAt)
  const pomodoroFocusMinutes = useAppState((s) => s.pomodoroFocusMinutes)
  const searchShortcutEnabled = useAppState((s) => s.searchShortcutEnabled)
  const todoViewMode = useAppState((s) => s.todoViewMode)

  const [newColTitle, setNewColTitle] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement | null>(null)
  const [backupIntervalOpen, setBackupIntervalOpen] = useState(false)
  const [backupIntervalDraft, setBackupIntervalDraft] = useState('')

  const ordered = useMemo(() => columns.slice().sort((a, b) => a.order - b.order), [columns])
  const todoColumnId = useMemo(() => {
    return ordered.find((c) => c.title.toLowerCase() === 'todo')?.id ?? ordered[0]?.id ?? null
  }, [ordered])

  const deleteCol = useMemo(() => (deleteId ? ordered.find((c) => c.id === deleteId) ?? null : null), [deleteId, ordered])
  const deleteCount = useMemo(() => {
    if (!deleteCol || !todoColumnId) return 0
    return todos.filter((t) => !t.archivedAt && (t.columnId ?? todoColumnId) === deleteCol.id).length
  }, [deleteCol, todoColumnId, todos])

  const backupIntervalRounded = Math.round(Number(backupIntervalDraft))
  const backupIntervalValid = Number.isFinite(backupIntervalRounded) && backupIntervalRounded > 0
  const backupIntervalError =
    backupIntervalDraft.trim().length === 0 ? 'Required' : backupIntervalValid ? undefined : 'Enter a number greater than 0'

  function openBackupInterval() {
    setBackupIntervalDraft(String(backupIntervalHours ?? 24))
    setBackupIntervalOpen(true)
  }

  function saveBackupInterval() {
    if (!backupIntervalValid) return
    setState((prev) => ({ ...prev, backupIntervalHours: backupIntervalRounded }))
    setBackupIntervalOpen(false)
  }

  function addColumn() {
    const title = newColTitle.trim()
    if (!title) return
    const now = Date.now()
    const max = Math.max(0, ...columns.map((c) => c.order))
    const col: TodoColumn = {
      id: newId('col'),
      title,
      order: max + 1,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    }
    setState((prev) => ({ ...prev, todoColumns: [...prev.todoColumns, col] }))
    setNewColTitle('')
  }

  function startRename(c: TodoColumn) {
    if (c.isSystem) return
    setRenamingId(c.id)
    setRenameTitle(c.title)
  }

  function saveRename() {
    if (!renamingId) return
    const col = columns.find((c) => c.id === renamingId)
    if (col?.isSystem) return
    const title = renameTitle.trim()
    if (!title) return
    setState((prev) => ({
      ...prev,
      todoColumns: prev.todoColumns.map((c) => (c.id === renamingId ? { ...c, title, updatedAt: Date.now() } : c)),
    }))
    setRenamingId(null)
  }

  function requestDeleteColumn(c: TodoColumn) {
    if (c.isSystem) return
    setDeleteId(c.id)
  }

  function confirmDeleteColumn() {
    if (!deleteCol) return
    if (deleteCol.isSystem) return
    if (!todoColumnId) return
    const now = Date.now()
    const colId = deleteCol.id
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.columnId === colId ? { ...t, columnId: todoColumnId, updatedAt: now } : t)),
      todoColumns: prev.todoColumns.filter((x) => x.id !== colId),
    }))
    setDeleteId(null)
  }

  async function onImportFile(file: File) {
    setImporting(true)
    setImportError(null)
    try {
      await importSessionFile(file)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.'
      setImportError(msg)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container col">
      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 750 }}>Settings</div>
          <span className="pill">local</span>
        </div>
        <div className="panelBody col" style={{ gap: 16 }}>
          <div className="sideCard">
            <div className="sideTitle">Backups</div>
            <div className="sideCaption">
              Export your full DevDox session as a JSON file you can store anywhere. Daily backups are enabled by default.
              Note: browsers can’t silently save files to arbitrary folders — you’ll get a one-click download when due.
            </div>

            <div className="row" style={{ gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <label className="row" style={{ gap: 10, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={backupEnabled ?? true}
                  onChange={(e) => setState((prev) => ({ ...prev, backupEnabled: e.target.checked }))}
                />
                <span style={{ fontWeight: 650 }}>Daily backup</span>
              </label>

              <div className="row" style={{ gap: 8 }}>
                <IconButton
                  label="Download session (export)"
                  kind="primary"
                  onClick={() => {
                    downloadSession()
                    setState((prev) => ({ ...prev, backupLastAt: Date.now() }))
                  }}
                >
                  <IconDownload />
                </IconButton>
                <input
                  ref={importRef}
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
                  label={importing ? 'Importing…' : 'Import session'}
                  disabled={importing}
                  onClick={() => importRef.current?.click()}
                >
                  <IconUpload />
                </IconButton>
              </div>
            </div>

            {importError ? <div className="pill pillBad" style={{ marginTop: 10 }}>{importError}</div> : null}

            <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="muted">
                Last backup: <strong>{backupLastAt ? new Date(backupLastAt).toLocaleString() : 'never'}</strong>
              </div>
              <div className="muted">
                Interval: <strong>{backupIntervalHours ?? 24}h</strong>
              </div>
              <IconButton
                label="Set backup interval (hours)"
                onClick={openBackupInterval}
              >
                <IconEdit />
              </IconButton>
            </div>
          </div>

          <div className="sideCard">
            <div className="sideTitle">Pomodoro</div>
            <div className="sideCaption">Set your focused work length (shown on the Dashboard). Default is 30 minutes.</div>

            <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="muted">
                Focus length: <strong>{pomodoroFocusMinutes ?? 30} min</strong>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={pomodoroFocusMinutes ?? 30}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (!Number.isFinite(n)) return
                  setState((prev) => ({ ...prev, pomodoroFocusMinutes: n }))
                }}
                title="Pomodoro focus minutes"
                style={{ flex: 1, minWidth: 240, maxWidth: 520 }}
              />
            </div>
          </div>

          <div className="sideCard">
            <div className="sideTitle">Search</div>
            <div className="sideCaption">Global search command palette. Shortcut: <strong>Ctrl/Cmd + K</strong>.</div>

            <label className="row" style={{ gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={searchShortcutEnabled ?? true}
                onChange={(e) => setState((prev) => ({ ...prev, searchShortcutEnabled: e.target.checked }))}
              />
              <span style={{ fontWeight: 650 }}>Enable Ctrl/Cmd+K shortcut</span>
            </label>
          </div>

          <div className="sideCard">
            <div className="sideTitle">Todos view</div>
            <div className="sideCaption">
              Choose how todos are displayed. Kanban is the default. Checklist view supports completion checkboxes and an important flag.
            </div>

            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <IconButton
                label="Kanban view"
                kind={(todoViewMode ?? 'kanban') === 'kanban' ? 'primary' : 'default'}
                onClick={() => setState((prev) => ({ ...prev, todoViewMode: 'kanban' }))}
              >
                <IconKanban />
              </IconButton>
              <IconButton
                label="Checklist view"
                kind={(todoViewMode ?? 'kanban') === 'checklist' ? 'primary' : 'default'}
                onClick={() => setState((prev) => ({ ...prev, todoViewMode: 'checklist' }))}
              >
                <IconList />
              </IconButton>
            </div>
          </div>

          <div className="sideCard">
            <div className="sideTitle">Kanban columns</div>
            <div className="sideCaption">
              Built-in columns can’t be deleted. Custom columns can be renamed or removed (todos are moved to <strong>Todo</strong>).
            </div>

            <div className="row" style={{ gap: 8, alignItems: 'stretch', marginTop: 10, flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="New column name"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addColumn()
                }}
                style={{ minWidth: 240, flex: 1 }}
              />
              <IconButton label="Add column" kind="primary" onClick={addColumn}>
                <IconPlus />
              </IconButton>
            </div>

            <div className="col" style={{ gap: 8, marginTop: 10 }}>
              {ordered.map((c) => {
                const isRenaming = renamingId === c.id
                return (
                  <div key={c.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <div className="row" style={{ gap: 8, flex: 1, minWidth: 0 }}>
                      {isRenaming ? (
                        <input
                          className="input"
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename()
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          autoFocus
                          style={{ flex: 1, minWidth: 220 }}
                        />
                      ) : (
                        <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                      )}
                      {c.isSystem ? <span className="pill">system</span> : <span className="pill pillWarn">custom</span>}
                    </div>

                    <div className="row" style={{ gap: 6 }}>
                      {isRenaming ? (
                        <IconButton label="Save name" kind="primary" onClick={saveRename}>
                          <IconSave />
                        </IconButton>
                      ) : (
                        <IconButton
                          label={c.isSystem ? 'System columns cannot be renamed' : 'Rename column'}
                          onClick={() => startRename(c)}
                          disabled={!!c.isSystem}
                        >
                          <IconEdit />
                        </IconButton>
                      )}
                      <IconButton
                        label={c.isSystem ? 'System columns cannot be deleted' : 'Delete column'}
                        kind="danger"
                        onClick={() => requestDeleteColumn(c)}
                        disabled={!!c.isSystem}
                      >
                        <IconTrash />
                      </IconButton>
                    </div>
                  </div>
                )
              })}
              {!ordered.length ? <div className="muted">No columns found.</div> : null}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteCol}
        title={deleteCol ? `Delete “${deleteCol.title}”?` : 'Delete column?'}
        message={
          deleteCol
            ? deleteCount
              ? `${deleteCount} active todo(s) will be moved to “Todo”. This cannot be undone.`
              : 'This cannot be undone.'
            : 'This cannot be undone.'
        }
        confirmLabel="Delete column"
        cancelLabel="Cancel"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDeleteColumn}
      />

      <PromptDialog
        open={backupIntervalOpen}
        title="Backup interval"
        message="Set how often DevDox should mark a backup as due (in hours)."
        inputLabel="Hours"
        value={backupIntervalDraft}
        onChange={setBackupIntervalDraft}
        min={1}
        step={1}
        error={backupIntervalError}
        confirmLabel="Save"
        confirmDisabled={!backupIntervalValid}
        onCancel={() => setBackupIntervalOpen(false)}
        onConfirm={saveBackupInterval}
      />
    </div>
  )
}


