import { useMemo, useState } from 'react'
import { copyToClipboard } from '../lib/clipboard'

export function ToolsPage() {
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
    <div className="panel">
      <div className="panelHeader">
        <div style={{ fontWeight: 650 }}>Base64</div>
        <span className="pill">encode/decode</span>
      </div>
      <div className="panelBody col">
        {msg ? <div className="pill pillWarn">{msg}</div> : null}
        <textarea className="textarea" placeholder="Plain text" value={plain} onChange={(e) => setPlain(e.target.value)} />
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
        <textarea className="textarea" placeholder="Base64" value={b64} onChange={(e) => setB64(e.target.value)} />
      </div>
    </div>
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
    <div className="panel">
      <div className="panelHeader">
        <div style={{ fontWeight: 650 }}>JSON</div>
        <span className="pill">format/minify</span>
      </div>
      <div className="panelBody col">
        {error ? <div className="pill pillBad">{error}</div> : null}
        <textarea className="textarea" placeholder='{"hello":"world"}' value={input} onChange={(e) => setInput(e.target.value)} />
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
        <textarea className="textarea" placeholder="Output" value={output} onChange={(e) => setOutput(e.target.value)} />
      </div>
    </div>
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
    <div className="panel">
      <div className="panelHeader">
        <div style={{ fontWeight: 650 }}>UUID</div>
        <span className="pill">v4</span>
      </div>
      <div className="panelBody col">
        <input className="input" value={uuid} readOnly />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn btnPrimary" type="button" onClick={() => setUuid(safeUuid())}>
            Generate
          </button>
          <button className="btn" type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UrlTool() {
  const [text, setText] = useState('')
  const [out, setOut] = useState('')

  return (
    <div className="panel">
      <div className="panelHeader">
        <div style={{ fontWeight: 650 }}>URL</div>
        <span className="pill">encode/decode</span>
      </div>
      <div className="panelBody col">
        <textarea className="textarea" placeholder="Text / URL" value={text} onChange={(e) => setText(e.target.value)} />
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
        <textarea className="textarea" placeholder="Output" value={out} onChange={(e) => setOut(e.target.value)} />
      </div>
    </div>
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
    <div className="panel">
      <div className="panelHeader">
        <div style={{ fontWeight: 650 }}>SHA-256</div>
        <span className="pill">{canCrypto ? 'webcrypto' : 'unsupported'}</span>
      </div>
      <div className="panelBody col">
        <textarea className="textarea" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} />
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
        <input className="input" value={hash} readOnly placeholder="hash output" />
      </div>
    </div>
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


