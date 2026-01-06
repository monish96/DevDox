import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconButton } from '../components/IconButton'
import { IconTrash } from '../components/icons'
import { newId } from '../lib/id'
import { setState, useAppState } from '../lib/storage'
import { summarize } from '../lib/summarize'
import type { VoiceDoc } from '../lib/types'

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: unknown) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }> & {
  isFinal: boolean
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function VoiceDocsPage() {
  const saved = useAppState((s) => s.voiceDocs)
  const [title, setTitle] = useState('Voice Doc')
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [summary, setSummary] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const ctor = useMemo(() => getSpeechRecognitionCtor(), [])
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  function start() {
    setError(null)
    if (!ctor) {
      setError('SpeechRecognition is not supported in this browser. Try Chrome/Edge.')
      return
    }
    const rec = new ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (ev) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        const transcript = (r[0]?.transcript ?? '').trim()
        if (!transcript) continue
        if (r.isFinal) finalChunk += (finalChunk ? ' ' : '') + transcript
        else interimChunk += (interimChunk ? ' ' : '') + transcript
      }
      if (finalChunk) {
        setText((t) => (t ? `${t}\n${finalChunk}` : finalChunk))
        setInterim('')
      } else {
        setInterim(interimChunk)
      }
    }

    rec.onerror = () => {
      setError('Mic error. Check browser permissions and that a microphone is available.')
      setIsRecording(false)
    }

    rec.onend = () => {
      setIsRecording(false)
      setInterim('')
    }

    recRef.current = rec
    setIsRecording(true)
    rec.start()
  }

  function stop() {
    try {
      recRef.current?.stop()
    } catch {
      // ignore
    } finally {
      setIsRecording(false)
      setInterim('')
    }
  }

  function doSummarize() {
    const s = summarize(text, 5)
    setSummary(s)
  }

  function saveVoiceDoc() {
    const trimmed = text.trim()
    if (!trimmed) return
    const now = Date.now()
    const doc: VoiceDoc = {
      id: newId('vdoc'),
      title: (title || 'Voice Doc').trim(),
      rawText: trimmed,
      summary: summary.trim(),
      createdAt: now,
      updatedAt: now,
    }
    setState((prev) => ({ ...prev, voiceDocs: [doc, ...prev.voiceDocs] }))
  }

  function saveAsNote() {
    const trimmed = text.trim()
    if (!trimmed) return
    const now = Date.now()
    const body =
      summary.trim().length > 0
        ? `Summary:\n${summary.trim()}\n\n---\n\nRaw:\n${trimmed}`
        : trimmed
    setState((prev) => ({
      ...prev,
      notes: [
        {
          id: newId('note'),
          title: (title || 'Voice Doc').trim(),
          body,
          order: now,
          createdAt: now,
          updatedAt: now,
        },
        ...prev.notes,
      ],
    }))
  }

  const deleteDoc = useMemo(() => (deleteId ? saved.find((d) => d.id === deleteId) ?? null : null), [deleteId, saved])

  function confirmDelete() {
    if (!deleteId) return
    const id = deleteId
    setState((prev) => ({ ...prev, voiceDocs: prev.voiceDocs.filter((d) => d.id !== id) }))
    setDeleteId(null)
  }

  return (
    <div className="container col">
      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 650 }}>Voice → Documentation</div>
          <span className="pill">{ctor ? 'SpeechRecognition ready' : 'No SpeechRecognition'}</span>
        </div>
        <div className="panelBody col">
          <div className="row" style={{ alignItems: 'stretch' }}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
            {!isRecording ? (
              <button className="btn btnPrimary" type="button" onClick={start}>
                Start dictation
              </button>
            ) : (
              <button className="btn" type="button" onClick={stop}>
                Stop
              </button>
            )}
          </div>

          {error ? <div className="pill pillBad">{error}</div> : null}
          {interim ? <div className="pill pillWarn">hearing: {interim}</div> : null}

          <textarea
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dictate or type documentation here…"
            style={{ minHeight: 260 }}
          />

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btnPrimary" type="button" onClick={doSummarize}>
              Summarize
            </button>
            <button className="btn" type="button" onClick={saveVoiceDoc}>
              Save voice doc
            </button>
            <button className="btn" type="button" onClick={saveAsNote}>
              Save as note
            </button>
            <button className="btn" type="button" onClick={() => { setText(''); setSummary(''); }}>
              Clear
            </button>
          </div>

          <div className="panel" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="panelHeader">
              <div style={{ fontWeight: 650 }}>Summary</div>
              <span className="pill">local algorithm</span>
            </div>
            <div className="panelBody">
              {summary.trim() ? <div style={{ whiteSpace: 'pre-wrap' }}>{summary}</div> : <div className="muted">Click “Summarize”.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 650 }}>Saved voice docs</div>
          <span className="pill">{saved.length}</span>
        </div>
        <div className="panelBody col">
          {saved.length ? (
            saved.slice(0, 10).map((d) => (
              <div key={d.id} className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'stretch' }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setTitle(d.title)
                    setText(d.rawText)
                    setSummary(d.summary)
                  }}
                  style={{ textAlign: 'left', flex: 1 }}
                >
                  <div style={{ fontWeight: 650 }}>{d.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(d.updatedAt).toLocaleString()}
                  </div>
                </button>
                <IconButton label="Delete saved voice doc" kind="danger" onClick={() => setDeleteId(d.id)}>
                  <IconTrash />
                </IconButton>
              </div>
            ))
          ) : (
            <div className="muted">No saved voice docs yet.</div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteDoc}
        title={deleteDoc ? `Delete “${deleteDoc.title}”?` : 'Delete voice doc?'}
        message="This will permanently remove the saved voice doc from this browser."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}


