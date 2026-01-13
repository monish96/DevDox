import { useEffect, useMemo, useRef, useState } from 'react'
import { Excalidraw, exportToSvg } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useSearchParams } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { IconCollapse, IconExpand, IconList, IconPlus, IconSave, IconTrash, IconX } from '../components/icons'
import { newId } from '../lib/id'
import { setState, useAppState } from '../lib/storage'
import type { Diagram } from '../lib/types'

export function DiagramsPage() {
  const [searchParams] = useSearchParams()
  const diagrams = useAppState((s) => s.diagrams)
  const canvasDiagrams = useMemo(
    () => diagrams.filter((d) => d.kind === 'canvas') as Extract<Diagram, { kind: 'canvas' }>[],
    [diagrams],
  )
  const [diagramId, setDiagramId] = useState<string | null>(canvasDiagrams[0]?.id ?? null)

  const selected = useMemo(
    () => canvasDiagrams.find((d) => d.id === diagramId) ?? null,
    [canvasDiagrams, diagramId],
  )

  const [title, setTitle] = useState('')
  const [initialScene, setInitialScene] = useState<any>(null)
  const [dirty, setDirty] = useState(false)
  const sceneRef = useRef<any>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  function syncFullscreenState() {
    const el = fullscreenRef.current
    if (!el) {
      setIsFullscreen(false)
      return
    }
    const d: any = document as any
    const fsEl = document.fullscreenElement ?? d.webkitFullscreenElement ?? null
    setIsFullscreen(fsEl === el)
  }

  async function toggleFullscreen() {
    const el = fullscreenRef.current as any
    if (!el) return
    const d: any = document as any
    const fsEl = document.fullscreenElement ?? d.webkitFullscreenElement ?? null
    try {
      if (fsEl) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (d.webkitExitFullscreen) d.webkitExitFullscreen()
        return
      }
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } catch {
      // ignore (permission/gesture restrictions)
    } finally {
      syncFullscreenState()
    }
  }

  useEffect(() => {
    syncFullscreenState()
    const onChange = () => syncFullscreenState()
    document.addEventListener('fullscreenchange', onChange)
    // Safari
    document.addEventListener('webkitfullscreenchange' as any, onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange' as any, onChange)
    }
  }, [])

  useEffect(() => {
    const id = searchParams.get('diagramId')
    if (!id) return
    if (canvasDiagrams.some((d) => d.id === id)) setDiagramId(id)
  }, [searchParams, canvasDiagrams])

  useEffect(() => {
    if (!selected) return
    setTitle(selected.title)
    setDirty(false)
    try {
      const parsed = selected.scene ? JSON.parse(selected.scene) : null
      const safe = sanitizeScene(parsed)
      setInitialScene(safe)
      sceneRef.current = safe
    } catch {
      setInitialScene(null)
      sceneRef.current = null
    }
  }, [selected?.id])

  // Backfill thumbnail for older diagrams (or those saved before we generated SVG).
  useEffect(() => {
    if (!selected) return
    if (selected.svg && selected.svg.trim()) return
    if (!selected.scene || !selected.scene.trim()) return

    let cancelled = false
    ;(async () => {
      try {
        const parsed = JSON.parse(selected.scene)
        const safe = sanitizeScene(parsed)
        const svgStr = await exportSceneToSvgString(safe)
        if (cancelled) return
        if (!svgStr) return
        setState((prev) => ({
          ...prev,
          diagrams: prev.diagrams.map((d) =>
            d.id === selected.id ? ({ ...(d as any), svg: svgStr, updatedAt: Date.now() } as any) : d,
          ),
        }))
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selected?.id, selected?.svg])

  function createDiagram() {
    const now = Date.now()
    const d: Extract<Diagram, { kind: 'canvas' }> = {
      id: newId('diag'),
      kind: 'canvas',
      title: `Diagram ${new Date(now).toLocaleString()}`,
      scene: '',
      svg: '',
      createdAt: now,
      updatedAt: now,
    }
    setState((prev) => ({ ...prev, diagrams: [d, ...prev.diagrams] }))
    setDiagramId(d.id)
    setTitle(d.title)
    setInitialScene(null)
    sceneRef.current = null
    setDirty(true)
  }

  async function saveDiagram() {
    if (!selected) return
    const t = title.trim() || 'Untitled diagram'
    const currentScene = sanitizeScene(sceneRef.current ?? initialScene ?? {})
    // Never persist collaborators (Map/non-serializable) or other transient fields.
    const persistable = {
      elements: Array.isArray(currentScene?.elements) ? currentScene.elements : [],
      appState: sanitizeAppState(currentScene?.appState),
      files: currentScene?.files ?? {},
    }
    const sceneJson = JSON.stringify(persistable)

    const svgStr = await exportSceneToSvgString(persistable)

    setState((prev) => ({
      ...prev,
      diagrams: prev.diagrams.map((d) =>
        d.id === selected.id
          ? ({
              ...d,
              title: t,
              scene: sceneJson,
              svg: svgStr,
              updatedAt: Date.now(),
            } as any)
          : d,
      ),
    }))
    setDirty(false)
  }

  function deleteDiagram(id: string) {
    setState((prev) => ({ ...prev, diagrams: prev.diagrams.filter((d) => d.id !== id) }))
    if (diagramId === id) setDiagramId(null)
  }

  return (
    <div className="container col">
      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 750 }}>Diagrams</div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="pill">Draw</span>
            <IconButton label="New diagram" kind="primary" onClick={createDiagram}>
              <IconPlus />
            </IconButton>
          </div>
        </div>
        <div className="panelBody">
          <div className="workspace" style={{ gridTemplateColumns: '360px minmax(0, 1fr)' }}>
            {/* Middle: library with thumbnails */}
            <div className="panel workspacePane">
              <div className="panelHeader">
                <div style={{ fontWeight: 650 }}>Library</div>
                <span className="pill">{canvasDiagrams.length}</span>
              </div>
              <div className="workspacePaneBody col" style={{ gap: 10 }}>
                {canvasDiagrams.length ? (
                  canvasDiagrams.map((d) => {
                    const activeRow = d.id === diagramId
                    return (
                      <div
                        key={d.id}
                        className={`listItem ${activeRow ? 'listItemActive' : ''}`.trim()}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDiagramId(d.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setDiagramId(d.id)
                          }
                        }}
                        style={{ display: 'grid', gridTemplateColumns: '76px 1fr auto', gap: 10, alignItems: 'center' }}
                      >
                        <div
                          className="panel"
                          style={{
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.16)',
                            overflow: 'hidden',
                            width: 76,
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {d.svg ? (
                            <div
                              style={{
                                width: '140px',
                                height: '90px',
                                transform: 'scale(0.45)',
                                transformOrigin: 'center',
                              }}
                              // SVG is generated locally by Mermaid; we store it as string.
                              dangerouslySetInnerHTML={{ __html: d.svg }}
                            />
                          ) : (
                            <div className="muted" style={{ fontSize: 11 }}>
                              no thumb
                            </div>
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.title}
                          </div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                            {new Date(d.updatedAt).toLocaleString()}
                          </div>
                        </div>

                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteDiagram(d.id)
                          }}
                        >
                          <IconButton label="Delete diagram" kind="danger" onClick={() => {}}>
                            <IconTrash />
                          </IconButton>
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="muted">No diagrams yet. Click the + next to <strong>Draw</strong> to create one.</div>
                )}
              </div>
            </div>

            {/* Right: editor/preview */}
            <div className="panel workspacePane">
              <div className="panelHeader">
                <div style={{ fontWeight: 650, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected?.title ?? 'Select a diagram'}
                </div>
                {selected ? (
                  <div className="row" style={{ gap: 8 }}>
                    <IconButton label="Open library" onClick={() => setLibraryOpen(true)}>
                      <IconList />
                    </IconButton>
                    <IconButton
                      label={dirty ? 'Save (updates thumbnail)' : 'Save'}
                      kind="primary"
                      onClick={saveDiagram}
                      disabled={!dirty}
                    >
                      <IconSave />
                    </IconButton>
                    <IconButton label="Delete" kind="danger" onClick={() => deleteDiagram(selected.id)}>
                      <IconTrash />
                    </IconButton>
                  </div>
                ) : null}
              </div>

              <div className="workspacePaneBody col" style={{ gap: 10 }}>
                {selected ? (
                  <>
                    <input
                      className="input"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        setDirty(true)
                      }}
                      placeholder="Diagram title"
                    />
                    <div className="panel" style={{ overflow: 'hidden' }}>
                      <div
                        ref={fullscreenRef}
                        className={`panel ${isFullscreen ? 'diagramCanvasFullscreen' : ''}`.trim()}
                        style={{
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          ...(isFullscreen ? { width: '100vw', height: '100vh', borderRadius: 0 } : {}),
                        }}
                      >
                        <div className="panelHeader">
                          <div style={{ fontWeight: 650 }}>Canvas</div>
                          <div className="row" style={{ gap: 8 }}>
                            <span className="pill">{dirty ? 'unsaved' : 'saved'}</span>
                            <IconButton
                              label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                              onClick={() => void toggleFullscreen()}
                            >
                              {isFullscreen ? <IconCollapse /> : <IconExpand />}
                            </IconButton>
                          </div>
                        </div>
                        <div
                          className="panelBody"
                          style={{
                            padding: 0,
                            height: isFullscreen ? 'calc(100vh - 56px)' : 520,
                          }}
                        >
                          {/* IMPORTANT: Excalidraw must be uncontrolled.
                              Passing changing initialData causes an infinite update loop. */}
                          <Excalidraw
                            key={selected.id}
                            theme={document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}
                            initialData={initialScene ?? undefined}
                            onChange={(elements, appState, files) => {
                              // appState contains non-serializable fields (e.g. collaborators: Map).
                              // Keep a persistable snapshot in a ref to avoid render loops.
                              sceneRef.current = {
                                elements,
                                appState: sanitizeAppState(appState),
                                files,
                              }
                              setDirty((d) => d || true)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="muted">Pick a diagram from the library or create a new one.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {libraryOpen ? (
        <div
          className="drawerOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Diagram library"
          onMouseDown={() => setLibraryOpen(false)}
        >
          <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="panelHeader">
              <div style={{ fontWeight: 650 }}>Library</div>
              <IconButton label="Close" onClick={() => setLibraryOpen(false)}>
                <IconX />
              </IconButton>
            </div>
            <div className="panelBody" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              <div className="col" style={{ gap: 10 }}>
                {canvasDiagrams.length ? (
                  canvasDiagrams.map((d) => {
                    const activeRow = d.id === diagramId
                    return (
                      <div
                        key={d.id}
                        className={`listItem ${activeRow ? 'listItemActive' : ''}`.trim()}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setDiagramId(d.id)
                          setLibraryOpen(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setDiagramId(d.id)
                            setLibraryOpen(false)
                          }
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '76px 1fr auto',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <div
                          className="panel"
                          style={{
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.16)',
                            overflow: 'hidden',
                            width: 76,
                            height: 56,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {d.svg ? (
                            <div
                              style={{
                                width: '140px',
                                height: '90px',
                                transform: 'scale(0.45)',
                                transformOrigin: 'center',
                              }}
                              dangerouslySetInnerHTML={{ __html: d.svg }}
                            />
                          ) : (
                            <div className="muted" style={{ fontSize: 11 }}>
                              no thumb
                            </div>
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 650,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {d.title}
                          </div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                            {new Date(d.updatedAt).toLocaleString()}
                          </div>
                        </div>

                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteDiagram(d.id)
                          }}
                        >
                          <IconButton label="Delete diagram" kind="danger" onClick={() => {}}>
                            <IconTrash />
                          </IconButton>
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="muted">No diagrams yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function sanitizeAppState(appState: any): any {
  const a = appState && typeof appState === 'object' ? { ...appState } : {}
  // Excalidraw expects collaborators to be a Map when present; we don't support collab.
  // Remove it from persisted state and avoid passing bad shapes back into Excalidraw.
  delete (a as any).collaborators
  return a
}

function sanitizeScene(scene: any): any {
  if (!scene || typeof scene !== 'object') return null
  const s: any = { ...scene }
  s.elements = Array.isArray(s.elements) ? s.elements : []
  s.files = s.files && typeof s.files === 'object' ? s.files : {}
  s.appState = sanitizeAppState(s.appState)
  // Excalidraw runtime expects collaborators to be a Map if present.
  ;(s.appState as any).collaborators = new Map()
  return s
}

async function exportSceneToSvgString(scene: any): Promise<string> {
  try {
    const svg = await exportToSvg({
      elements: Array.isArray(scene?.elements) ? scene.elements : [],
      appState: {
        ...(scene?.appState ?? {}),
        collaborators: new Map(),
      },
      files: scene?.files ?? {},
    } as any)
    return svg?.outerHTML ? String(svg.outerHTML) : ''
  } catch {
    return ''
  }
}


