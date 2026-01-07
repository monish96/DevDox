import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { IconButton } from '../components/IconButton'
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconIndent,
  IconList,
  IconOutdent,
  IconPlus,
  IconSave,
  IconTrash,
  IconX,
} from '../components/icons'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { newId } from '../lib/id'
import { setState, useAppState } from '../lib/storage'
import type { Note, Snippet } from '../lib/types'

export function NotesPage() {
  const [searchParams] = useSearchParams()
  const notes = useAppState((s) => s.notes)
  const snippets = useAppState((s) => s.snippets)

  const [active, setActive] = useState<'notes' | 'snippets'>('notes')
  const [noteId, setNoteId] = useState<string | null>(notes[0]?.id ?? null)
  const [snippetId, setSnippetId] = useState<string | null>(snippets[0]?.id ?? null)

  const selectedNote = useMemo(() => notes.find((n) => n.id === noteId) ?? null, [notes, noteId])
  const selectedSnippet = useMemo(
    () => snippets.find((s) => s.id === snippetId) ?? null,
    [snippets, snippetId],
  )

  useEffect(() => {
    const nid = searchParams.get('noteId')
    const sid = searchParams.get('snippetId')
    if (sid) {
      if (snippets.some((s) => s.id === sid)) {
        setActive('snippets')
        setSnippetId(sid)
      }
      return
    }
    if (nid) {
      if (notes.some((n) => n.id === nid)) {
        setActive('notes')
        setNoteId(nid)
      }
    }
  }, [searchParams, notes, snippets])

  const treeRef = useRef<HTMLDivElement | null>(null)
  const forceEditNextNoteSelectionRef = useRef(false)
  const forceEditNextSnippetSelectionRef = useRef(false)
  const [noteHistory, setNoteHistory] = useState<string[]>([])
  const [noteHistoryIdx, setNoteHistoryIdx] = useState(-1)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [listDrawerOpen, setListDrawerOpen] = useState(false)

  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraftTitle, setNoteDraftTitle] = useState('')
  const [noteDraftBody, setNoteDraftBody] = useState('')

  const [snippetEditing, setSnippetEditing] = useState(false)
  const [snippetDraftTitle, setSnippetDraftTitle] = useState('')
  const [snippetDraftLang, setSnippetDraftLang] = useState('typescript')
  const [snippetDraftTags, setSnippetDraftTags] = useState('')
  const [snippetDraftCode, setSnippetDraftCode] = useState('')

  useEffect(() => {
    if (!selectedNote) return
    setNoteDraftTitle(selectedNote.title)
    setNoteDraftBody(selectedNote.body)

    // Default behavior: selecting an existing note shows preview.
    // But when creating a new note, we want to land directly in edit mode.
    if (forceEditNextNoteSelectionRef.current) {
      forceEditNextNoteSelectionRef.current = false
      setNoteEditing(true)
    } else {
      setNoteEditing(false)
    }
  }, [selectedNote?.id])

  useEffect(() => {
    if (!selectedSnippet) return
    setSnippetDraftTitle(selectedSnippet.title)
    setSnippetDraftLang(selectedSnippet.language)
    setSnippetDraftTags(selectedSnippet.tags.join(', '))
    setSnippetDraftCode(selectedSnippet.code)

    // Default behavior: selecting an existing snippet shows preview.
    // But when creating a new snippet, we want to land directly in edit mode.
    if (forceEditNextSnippetSelectionRef.current) {
      forceEditNextSnippetSelectionRef.current = false
      setSnippetEditing(true)
    } else {
      setSnippetEditing(false)
    }
  }, [selectedSnippet?.id])

  useEffect(() => {
    // Give keyboard focus to the middle list/tree when switching modes.
    if (active === 'notes') window.setTimeout(() => treeRef.current?.focus(), 0)
  }, [active])

  useEffect(() => {
    if (!listDrawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setListDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [listDrawerOpen])

  function createNote() {
    const now = Date.now()
    const note: Note = {
      id: newId('note'),
      title: `New note ${new Date(now).toLocaleString()}`,
      body: '',
      order: now,
      createdAt: now,
      updatedAt: now,
    }
    setActive('notes')
    forceEditNextNoteSelectionRef.current = true
    setState((prev) => ({ ...prev, notes: [note, ...prev.notes] }))
    setNoteId(note.id)
    setNoteDraftTitle(note.title)
    setNoteDraftBody(note.body)
  }

  function saveNote() {
    if (!selectedNote) return
    const title = noteDraftTitle.trim() || 'Untitled'
    const body = noteDraftBody
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === selectedNote.id ? { ...n, title, body, updatedAt: Date.now() } : n,
      ),
    }))
    setNoteEditing(false)
  }

  function deleteNote(id: string) {
    setState((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }))
    if (noteId === id) setNoteId(null)
  }

  function createSnippet() {
    const now = Date.now()
    const snip: Snippet = {
      id: newId('snip'),
      title: `New snippet ${new Date(now).toLocaleString()}`,
      language: 'typescript',
      code: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    setActive('snippets')
    forceEditNextSnippetSelectionRef.current = true
    setState((prev) => ({ ...prev, snippets: [snip, ...prev.snippets] }))
    setSnippetId(snip.id)
    setSnippetDraftTitle(snip.title)
    setSnippetDraftLang(snip.language)
    setSnippetDraftTags('')
    setSnippetDraftCode('')
  }

  function saveSnippet() {
    if (!selectedSnippet) return
    const title = snippetDraftTitle.trim() || 'Untitled'
    const language = snippetDraftLang.trim() || 'text'
    const tags = snippetDraftTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    setState((prev) => ({
      ...prev,
      snippets: prev.snippets.map((s) =>
        s.id === selectedSnippet.id
          ? { ...s, title, language, code: snippetDraftCode, tags, updatedAt: Date.now() }
          : s,
      ),
    }))
    setSnippetEditing(false)
  }

  function deleteSnippet(id: string) {
    setState((prev) => ({ ...prev, snippets: prev.snippets.filter((s) => s.id !== id) }))
    if (snippetId === id) setSnippetId(null)
  }

  function deleteNoteAndReselect(id: string) {
    const ids = flatNoteIds.filter((x) => x !== id)
    const idx = flatNoteIds.indexOf(id)
    const fallback = ids[idx] ?? ids[idx - 1] ?? ids[0] ?? null
    deleteNote(id)
    if (noteId === id) setNoteId(fallback)
  }

  function deleteSnippetAndReselect(id: string) {
    const ids = snippets.map((s) => s.id).filter((x) => x !== id)
    const idx = snippets.findIndex((s) => s.id === id)
    const fallback = ids[idx] ?? ids[idx - 1] ?? ids[0] ?? null
    deleteSnippet(id)
    if (snippetId === id) setSnippetId(fallback)
  }

  // Keep a simple back/forward history for note navigation
  useEffect(() => {
    if (!noteId) return
    setNoteHistory((prev) => {
      const base = prev.slice(0, noteHistoryIdx + 1)
      if (base[base.length - 1] === noteId) return prev
      const next = [...base, noteId]
      setNoteHistoryIdx(next.length - 1)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  function goBack() {
    if (noteHistoryIdx <= 0) return
    const nextIdx = noteHistoryIdx - 1
    setNoteHistoryIdx(nextIdx)
    setNoteId(noteHistory[nextIdx] ?? null)
  }

  function goForward() {
    if (noteHistoryIdx >= noteHistory.length - 1) return
    const nextIdx = noteHistoryIdx + 1
    setNoteHistoryIdx(nextIdx)
    setNoteId(noteHistory[nextIdx] ?? null)
  }

  const noteTree = useMemo(() => buildNoteTree(notes), [notes])
  const flatNoteIds = useMemo(() => flattenTree(noteTree), [noteTree])

  function selectAdjacent(delta: number) {
    if (!noteId) return
    const idx = flatNoteIds.indexOf(noteId)
    if (idx < 0) return
    const next = flatNoteIds[idx + delta]
    if (next) setNoteId(next)
  }

  function moveNoteUpDown(id: string, dir: -1 | 1) {
    setState((prev) => {
      const cur = prev.notes.find((n) => n.id === id)
      if (!cur) return prev
      const siblings = prev.notes
        .filter((n) => (n.parentId ?? null) === (cur.parentId ?? null))
        .slice()
        .sort((a, b) => a.order - b.order)
      const i = siblings.findIndex((n) => n.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= siblings.length) return prev
      const a = siblings[i]
      const b = siblings[j]
      const ao = a.order
      const bo = b.order
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === a.id ? { ...n, order: bo, updatedAt: Date.now() } : n.id === b.id ? { ...n, order: ao, updatedAt: Date.now() } : n,
        ),
      }
    })
  }

  function indentNote(id: string) {
    setState((prev) => {
      const cur = prev.notes.find((n) => n.id === id)
      if (!cur) return prev
      const siblings = prev.notes
        .filter((n) => (n.parentId ?? null) === (cur.parentId ?? null))
        .slice()
        .sort((a, b) => a.order - b.order)
      const i = siblings.findIndex((n) => n.id === id)
      if (i <= 0) return prev
      const newParent = siblings[i - 1]
      const maxOrder =
        Math.max(
          0,
          ...prev.notes.filter((n) => n.parentId === newParent.id).map((n) => n.order),
        ) + 1
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id
            ? { ...n, parentId: newParent.id, order: maxOrder, updatedAt: Date.now() }
            : n,
        ),
      }
    })
  }

  function outdentNote(id: string) {
    setState((prev) => {
      const cur = prev.notes.find((n) => n.id === id)
      if (!cur || !cur.parentId) return prev
      const parent = prev.notes.find((n) => n.id === cur.parentId)
      const newParentId = parent?.parentId
      const maxOrder =
        Math.max(
          0,
          ...prev.notes.filter((n) => (n.parentId ?? null) === (newParentId ?? null)).map((n) => n.order),
        ) + 1
      return {
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, parentId: newParentId, order: maxOrder, updatedAt: Date.now() } : n,
        ),
      }
    })
  }

  return (
    <div className="container col">
      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 750 }}>Notes & Snippets</div>
          {/* Keep this header clean; actions live inside panes */}
        </div>
        <div className="panelBody">
          <div className="workspace">
            {/* Left switcher */}
            <div className="panel workspacePane">
              <div className="workspacePaneBody sideCard">
                <div className="sideTitle">DevDox</div>
                <div className="sideCaption">Notes • Snippets</div>
                <div className="sideTabsVertical">
                  <div
                    className={`sideTab ${active === 'notes' ? 'sideTabActive' : ''}`.trim()}
                    onClick={() => setActive('notes')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActive('notes')
                      }
                    }}
                  >
                    <div className="sideTabRow">
                      <span className="sideTabLabel">Notes</span>
                      <IconButton
                        label="New note"
                        kind="primary"
                        onClick={() => createNote()}
                      >
                        <IconPlus />
                      </IconButton>
                    </div>
                  </div>
                  <div
                    className={`sideTab ${active === 'snippets' ? 'sideTabActive' : ''}`.trim()}
                    onClick={() => setActive('snippets')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActive('snippets')
                      }
                    }}
                  >
                    <div className="sideTabRow">
                      <span className="sideTabLabel">Snippets</span>
                      <IconButton
                        label="New snippet"
                        kind="primary"
                        onClick={() => createSnippet()}
                      >
                        <IconPlus />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {active === 'notes' ? (
              <>
                {/* Middle tree */}
                <div className="panel workspacePane">
                  <div className="panelHeader">
                    <div style={{ fontWeight: 650 }}>List</div>
                    <div className="row" style={{ gap: 8 }}>
                      <IconButton label="Back" onClick={goBack} disabled={noteHistoryIdx <= 0}>
                        <IconChevronLeft />
                      </IconButton>
                      <IconButton
                        label="Forward"
                        onClick={goForward}
                        disabled={noteHistoryIdx >= noteHistory.length - 1}
                      >
                        <IconChevronRight />
                      </IconButton>
                      <IconButton label="New note" kind="primary" onClick={createNote}>
                        <IconPlus />
                      </IconButton>
                    </div>
                  </div>
                  <div
                    className="workspacePaneBody"
                    ref={treeRef}
                    tabIndex={0}
                    style={{ outline: 'none' }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        selectAdjacent(-1)
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        selectAdjacent(1)
                      }
                    }}
                  >
                    {noteTree.length ? (
                      <NoteTree
                        nodes={noteTree}
                        selectedId={noteId}
                        collapsed={collapsed}
                        onToggle={(id) =>
                          setCollapsed((p) => ({ ...p, [id]: !p[id] }))
                        }
                        onSelect={(id) => setNoteId(id)}
                      />
                    ) : (
                      <div className="muted">No notes yet.</div>
                    )}
                  </div>
                </div>

                {/* Right preview/editor */}
                <div className="panel workspacePane">
                  <div className="panelHeader">
                    <div style={{ fontWeight: 650, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedNote?.title ?? 'Select a note'}
                    </div>
                    {selectedNote ? (
                      <div className="row" style={{ gap: 8 }}>
                        <IconButton label="Open list" onClick={() => setListDrawerOpen(true)}>
                          <IconList />
                        </IconButton>
                        {!noteEditing ? (
                          <>
                            <IconButton label="Move up" onClick={() => moveNoteUpDown(selectedNote.id, -1)}>
                              <IconArrowUp />
                            </IconButton>
                            <IconButton label="Move down" onClick={() => moveNoteUpDown(selectedNote.id, 1)}>
                              <IconArrowDown />
                            </IconButton>
                            <IconButton label="Indent" onClick={() => indentNote(selectedNote.id)}>
                              <IconIndent />
                            </IconButton>
                            <IconButton label="Outdent" onClick={() => outdentNote(selectedNote.id)}>
                              <IconOutdent />
                            </IconButton>
                            <IconButton label="Edit" kind="primary" onClick={() => setNoteEditing(true)}>
                              <IconEdit />
                            </IconButton>
                            <IconButton label="Delete" kind="danger" onClick={() => deleteNote(selectedNote.id)}>
                              <IconTrash />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton label="Save" kind="primary" onClick={saveNote}>
                              <IconSave />
                            </IconButton>
                            <IconButton
                              label="Cancel"
                              onClick={() => {
                                setNoteDraftTitle(selectedNote.title)
                                setNoteDraftBody(selectedNote.body)
                                setNoteEditing(false)
                              }}
                            >
                              <IconX />
                            </IconButton>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="workspacePaneBody">
                    {selectedNote ? (
                      noteEditing ? (
                        <div className="col" style={{ gap: 10 }}>
                          <input
                            className="input"
                            value={noteDraftTitle}
                            onChange={(e) => setNoteDraftTitle(e.target.value)}
                            placeholder="Note title"
                          />
                          <textarea
                            className="textarea"
                            value={noteDraftBody}
                            onChange={(e) => setNoteDraftBody(e.target.value)}
                            placeholder="Write notes (Markdown supported)."
                            style={{ minHeight: 320 }}
                          />
                          <div className="muted" style={{ fontSize: 12 }}>
                            Markdown is supported (GFM).
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="pill">Preview (md)</span>
                          <div style={{ height: 10 }} />
                          <div className="panel" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div className="panelBody">
                              {selectedNote.body.trim() ? (
                                <MarkdownPreview value={selectedNote.body} />
                              ) : (
                                <div className="muted">Empty note. Click Edit.</div>
                              )}
                            </div>
                          </div>
                        </>
                      )
                    ) : (
                      <div className="muted">Select a note from the tree.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Middle list */}
                <div className="panel workspacePane">
                  <div className="panelHeader">
                    <div style={{ fontWeight: 650 }}>Snippets</div>
                    <IconButton label="New snippet" kind="primary" onClick={createSnippet}>
                      <IconPlus />
                    </IconButton>
                  </div>
                  <div className="workspacePaneBody col" style={{ gap: 10 }}>
                    {snippets.length ? (
                      snippets.map((s) => {
                        const activeRow = s.id === snippetId
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`listItem ${activeRow ? 'listItemActive' : ''}`.trim()}
                            onClick={() => setSnippetId(s.id)}
                          >
                            <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.title}
                            </div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {s.language}
                              {s.tags.length ? ` • ${s.tags.slice(0, 3).join(', ')}` : ''}
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="muted">No snippets yet.</div>
                    )}
                  </div>
                </div>

                {/* Right snippet */}
                <div className="panel workspacePane">
                  <div className="panelHeader">
                    <div style={{ fontWeight: 650, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedSnippet?.title ?? 'Select a snippet'}
                    </div>
                    {selectedSnippet ? (
                      <div className="row" style={{ gap: 8 }}>
                        <IconButton label="Open list" onClick={() => setListDrawerOpen(true)}>
                          <IconList />
                        </IconButton>
                        {!snippetEditing ? (
                          <>
                            <IconButton label="Edit" kind="primary" onClick={() => setSnippetEditing(true)}>
                              <IconEdit />
                            </IconButton>
                            <IconButton label="Delete" kind="danger" onClick={() => deleteSnippet(selectedSnippet.id)}>
                              <IconTrash />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton label="Save" kind="primary" onClick={saveSnippet}>
                              <IconSave />
                            </IconButton>
                            <IconButton
                              label="Cancel"
                              onClick={() => {
                                setSnippetDraftTitle(selectedSnippet.title)
                                setSnippetDraftLang(selectedSnippet.language)
                                setSnippetDraftTags(selectedSnippet.tags.join(', '))
                                setSnippetDraftCode(selectedSnippet.code)
                                setSnippetEditing(false)
                              }}
                            >
                              <IconX />
                            </IconButton>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="workspacePaneBody col" style={{ gap: 10 }}>
                    {selectedSnippet ? (
                      <>
                        {snippetEditing ? (
                          <>
                            <input
                              className="input"
                              value={snippetDraftTitle}
                              onChange={(e) => setSnippetDraftTitle(e.target.value)}
                              placeholder="Snippet title"
                            />
                            <div className="row" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
                              <select
                                className="select"
                                value={snippetDraftLang}
                                onChange={(e) => setSnippetDraftLang(e.target.value)}
                                style={{ maxWidth: 190 }}
                                title="Language"
                              >
                                {['typescript', 'javascript', 'json', 'bash', 'python', 'markup', 'text'].map((l) => (
                                  <option key={l} value={l}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="input"
                                value={snippetDraftTags}
                                onChange={(e) => setSnippetDraftTags(e.target.value)}
                                placeholder="tags (comma separated)"
                              />
                            </div>
                            <textarea
                              className="textarea"
                              value={snippetDraftCode}
                              onChange={(e) => setSnippetDraftCode(e.target.value)}
                              placeholder="Paste code here…"
                              style={{ minHeight: 220 }}
                            />
                          </>
                        ) : null}

                        <CodeBlock
                          title={selectedSnippet.title}
                          language={selectedSnippet.language}
                          code={selectedSnippet.code || '// your snippet preview will show here'}
                        />
                      </>
                    ) : (
                      <div className="muted">Select a snippet from the list.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {listDrawerOpen ? (
        <div
          className="drawerOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="List"
          onMouseDown={() => setListDrawerOpen(false)}
        >
          <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="panelHeader">
              <div style={{ fontWeight: 650 }}>{active === 'notes' ? 'List' : 'Snippets'}</div>
              <IconButton label="Close" onClick={() => setListDrawerOpen(false)}>
                <IconX />
              </IconButton>
            </div>
            <div className="panelBody" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {active === 'notes' ? (
                noteTree.length ? (
                  <NoteDrawerTree
                    nodes={noteTree}
                    selectedId={noteId}
                    collapsed={collapsed}
                    onToggle={(id) => setCollapsed((p) => ({ ...p, [id]: !p[id] }))}
                    onSelect={(id) => {
                      setNoteId(id)
                      setListDrawerOpen(false)
                    }}
                    onDelete={(id) => deleteNoteAndReselect(id)}
                  />
                ) : (
                  <div className="muted">No notes yet.</div>
                )
              ) : snippets.length ? (
                <div className="col" style={{ gap: 10 }}>
                  {snippets.map((s) => {
                    const activeRow = s.id === snippetId
                    return (
                      <div
                        key={s.id}
                        className={`listItem ${activeRow ? 'listItemActive' : ''}`.trim()}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSnippetId(s.id)
                          setListDrawerOpen(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSnippetId(s.id)
                            setListDrawerOpen(false)
                          }
                        }}
                      >
                        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 650,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s.title}
                            </div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {s.language}
                              {s.tags.length ? ` • ${s.tags.slice(0, 3).join(', ')}` : ''}
                            </div>
                          </div>

                          <IconButton
                            label="Delete snippet"
                            kind="danger"
                            onClick={() => deleteSnippetAndReselect(s.id)}
                          >
                            <IconTrash />
                          </IconButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="muted">No snippets yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type NoteTreeNode = { note: Note; children: NoteTreeNode[]; depth: number }

function buildNoteTree(notes: Note[]): NoteTreeNode[] {
  const byParent = new Map<string | null, Note[]>()
  for (const n of notes) {
    const key = (n.parentId ?? null) as string | null
    const arr = byParent.get(key) ?? []
    arr.push(n)
    byParent.set(key, arr)
  }
  for (const [k, arr] of byParent) {
    arr.sort((a, b) => a.order - b.order || a.updatedAt - b.updatedAt)
    byParent.set(k, arr)
  }

  const seen = new Set<string>()
  const build = (parentId: string | null, depth: number): NoteTreeNode[] => {
    const arr = byParent.get(parentId) ?? []
    const nodes: NoteTreeNode[] = []
    for (const n of arr) {
      if (seen.has(n.id)) continue
      seen.add(n.id)
      nodes.push({ note: n, children: build(n.id, depth + 1), depth })
    }
    return nodes
  }

  const roots = build(null, 0)
  // Any orphans become roots
  const orphans = notes.filter((n) => !seen.has(n.id)).sort((a, b) => a.order - b.order)
  for (const o of orphans) roots.push({ note: o, children: build(o.id, 1), depth: 0 })
  return roots
}

function flattenTree(nodes: NoteTreeNode[]): string[] {
  const out: string[] = []
  const walk = (n: NoteTreeNode[]) => {
    for (const node of n) {
      out.push(node.note.id)
      if (node.children.length) walk(node.children)
    }
  }
  walk(nodes)
  return out
}

function NoteTree(props: {
  nodes: NoteTreeNode[]
  selectedId: string | null
  collapsed: Record<string, boolean>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}) {
  return (
    <div className="col" style={{ gap: 10 }}>
      {props.nodes.map((n) => (
        <NoteTreeNodeRow
          key={n.note.id}
          node={n}
          selectedId={props.selectedId}
          collapsed={props.collapsed}
          onToggle={props.onToggle}
          onSelect={props.onSelect}
        />
      ))}
    </div>
  )
}

function NoteDrawerTree(props: {
  nodes: NoteTreeNode[]
  selectedId: string | null
  collapsed: Record<string, boolean>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="col" style={{ gap: 10 }}>
      {props.nodes.map((n) => (
        <NoteDrawerTreeNodeRow
          key={n.note.id}
          node={n}
          selectedId={props.selectedId}
          collapsed={props.collapsed}
          onToggle={props.onToggle}
          onSelect={props.onSelect}
          onDelete={props.onDelete}
        />
      ))}
    </div>
  )
}

function NoteDrawerTreeNodeRow(props: {
  node: NoteTreeNode
  selectedId: string | null
  collapsed: Record<string, boolean>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  const n = props.node.note
  const selected = n.id === props.selectedId
  const hasChildren = props.node.children.length > 0
  const isCollapsed = !!props.collapsed[n.id]

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="treeRow" style={{ marginLeft: props.node.depth * 12 }}>
        {hasChildren ? (
          <button
            type="button"
            className="treeToggle"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            onClick={() => props.onToggle(n.id)}
          >
            {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
          </button>
        ) : (
          <span style={{ width: 22 }} />
        )}

        <div
          className={`listItem ${selected ? 'listItemActive' : ''}`.trim()}
          role="button"
          tabIndex={0}
          onClick={() => props.onSelect(n.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              props.onSelect(n.id)
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {n.title}
            </div>
          </div>
          <IconButton label="Delete note" kind="danger" onClick={() => props.onDelete(n.id)}>
            <IconTrash />
          </IconButton>
        </div>
      </div>

      {!isCollapsed && hasChildren ? (
        <div className="col" style={{ gap: 8 }}>
          {props.node.children.map((c) => (
            <NoteDrawerTreeNodeRow
              key={c.note.id}
              node={c}
              selectedId={props.selectedId}
              collapsed={props.collapsed}
              onToggle={props.onToggle}
              onSelect={props.onSelect}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NoteTreeNodeRow(props: {
  node: NoteTreeNode
  selectedId: string | null
  collapsed: Record<string, boolean>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}) {
  const n = props.node.note
  const selected = n.id === props.selectedId
  const hasChildren = props.node.children.length > 0
  const isCollapsed = !!props.collapsed[n.id]

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="treeRow" style={{ marginLeft: props.node.depth * 12 }}>
        {hasChildren ? (
          <button
            type="button"
            className="treeToggle"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            onClick={() => props.onToggle(n.id)}
          >
            {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
          </button>
        ) : (
          <span style={{ width: 22 }} />
        )}

        <button
          type="button"
          className={`listItem ${selected ? 'listItemActive' : ''}`.trim()}
          onClick={() => props.onSelect(n.id)}
          style={{ flex: 1, minWidth: 0 }}
        >
          <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {n.title}
          </div>
        </button>
      </div>

      {!isCollapsed && hasChildren ? (
        <div className="col" style={{ gap: 8 }}>
          {props.node.children.map((c) => (
            <NoteTreeNodeRow
              key={c.note.id}
              node={c}
              selectedId={props.selectedId}
              collapsed={props.collapsed}
              onToggle={props.onToggle}
              onSelect={props.onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}


