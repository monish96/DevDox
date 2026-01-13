import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { IconCollapse, IconExpand } from '../components/icons'
import { copyToClipboard } from '../lib/clipboard'

export function ToolsPage() {
  const location = useLocation()

  useEffect(() => {
    const hash = (location.hash || '').replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  return (
    <div className="container col">
      <div className="grid2">
        <Base64Tool />
        <JsonTool />
        <UuidTool />
        <UrlTool />
        <Sha256Tool />
      </div>
    </div>
  )
}

function ToolPanel(props: { id: string; title: string; pill?: string; children: ReactNode }) {
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

  return (
    <div
      className={`panel toolPanel ${isFullscreen ? 'toolPanelFullscreen' : ''}`.trim()}
      id={props.id}
      ref={fullscreenRef}
    >
      <div className="panelHeader">
        <div style={{ fontWeight: 650 }}>{props.title}</div>
        <div className="row" style={{ gap: 8 }}>
          {props.pill ? <span className="pill">{props.pill}</span> : null}
          <IconButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {isFullscreen ? <IconCollapse /> : <IconExpand />}
          </IconButton>
        </div>
      </div>
      <div className="panelBody col toolPanelBody">{props.children}</div>
    </div>
  )
}

function Base64Tool() {
  const [plain, setPlain] = useState('')
  const [b64, setB64] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  function encode() {
    try {
      const bytes = new TextEncoder().encode(plain)
      let binary = ''
      bytes.forEach((b) => (binary += String.fromCharCode(b)))
      setB64(btoa(binary))
      setMsg(null)
    } catch {
      setMsg('Encode failed')
    }
  }

  function decode() {
    try {
      const binary = atob(b64.trim())
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      setPlain(new TextDecoder().decode(bytes))
      setMsg(null)
    } catch {
      setMsg('Decode failed (invalid base64?)')
    }
  }

  return (
    <ToolPanel id="base64" title="Base64" pill="encode/decode">
      {msg ? <div className="pill pillWarn">{msg}</div> : null}
      <div className="toolSplit">
        <div className="col" style={{ minWidth: 0 }}>
          <textarea className="textarea toolArea" placeholder="Plain text" value={plain} onChange={(e) => setPlain(e.target.value)} />
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btnPrimary" type="button" onClick={encode}>
              Encode →
            </button>
            <button className="btn" type="button" onClick={decode}>
              ← Decode
            </button>
            <button className="btn" type="button" onClick={() => { setPlain(''); setB64(''); setMsg(null) }}>
              Clear
            </button>
          </div>
        </div>
        <textarea className="textarea toolArea" placeholder="Base64" value={b64} onChange={(e) => setB64(e.target.value)} />
      </div>
    </ToolPanel>
  )
}

function JsonTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function format() {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch {
      setError('Invalid JSON')
    }
  }

  function minify() {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError(null)
    } catch {
      setError('Invalid JSON')
    }
  }

  return (
    <ToolPanel id="json" title="JSON" pill="format/minify">
      {error ? <div className="pill pillBad">{error}</div> : null}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn btnPrimary" type="button" onClick={format}>
          Format
        </button>
        <button className="btn" type="button" onClick={minify}>
          Minify
        </button>
        <button className="btn" type="button" onClick={() => { setInput(''); setOutput(''); setError(null) }}>
          Clear
        </button>
      </div>
      <div className="toolSplit">
        <textarea className="textarea toolArea" placeholder='{"hello":"world"}' value={input} onChange={(e) => setInput(e.target.value)} />
        <textarea className="textarea toolArea" placeholder="Output" value={output} onChange={(e) => setOutput(e.target.value)} />
      </div>
    </ToolPanel>
  )
}

function UuidTool() {
  const [uuid, setUuid] = useState(() => safeUuid())
  const [copied, setCopied] = useState(false)

  async function copy() {
    const ok = await copyToClipboard(uuid)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 900)
  }

  return (
    <ToolPanel id="uuid" title="UUID" pill="v4">
      <input className="input" value={uuid} readOnly />
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn btnPrimary" type="button" onClick={() => setUuid(safeUuid())}>
          Generate
        </button>
        <button className="btn" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </ToolPanel>
  )
}

function UrlTool() {
  const [text, setText] = useState('')
  const [out, setOut] = useState('')

  return (
    <ToolPanel id="url" title="URL" pill="encode/decode">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn btnPrimary" type="button" onClick={() => setOut(encodeURIComponent(text))}>
          Encode
        </button>
        <button className="btn" type="button" onClick={() => setOut(safeDecodeURIComponent(text))}>
          Decode
        </button>
        <button className="btn" type="button" onClick={() => { setText(''); setOut('') }}>
          Clear
        </button>
      </div>
      <div className="toolSplit">
        <textarea className="textarea toolArea" placeholder="Text / URL" value={text} onChange={(e) => setText(e.target.value)} />
        <textarea className="textarea toolArea" placeholder="Output" value={out} onChange={(e) => setOut(e.target.value)} />
      </div>
    </ToolPanel>
  )
}

function Sha256Tool() {
  const [text, setText] = useState('')
  const [hash, setHash] = useState('')
  const [copied, setCopied] = useState(false)

  const canCrypto = useMemo(() => !!(crypto && crypto.subtle), [])

  async function compute() {
    try {
      const bytes = new TextEncoder().encode(text)
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      setHash(toHex(new Uint8Array(digest)))
    } catch {
      setHash('')
    }
  }

  async function copy() {
    const ok = await copyToClipboard(hash)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 900)
  }

  return (
    <ToolPanel id="sha256" title="SHA-256" pill={canCrypto ? 'webcrypto' : 'unsupported'}>
      <div className="toolSplit">
        <div className="col" style={{ minWidth: 0 }}>
          <textarea className="textarea toolArea" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btnPrimary" type="button" onClick={compute} disabled={!canCrypto}>
              Hash
            </button>
            <button className="btn" type="button" onClick={copy} disabled={!hash}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn" type="button" onClick={() => { setText(''); setHash(''); }}>
              Clear
            </button>
          </div>
        </div>
        <div className="col" style={{ minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 12 }}>Hash output</div>
          <input className="input" value={hash} readOnly placeholder="sha-256…" />
        </div>
      </div>
    </ToolPanel>
  )
}

function safeUuid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return 'Decode failed'
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}


