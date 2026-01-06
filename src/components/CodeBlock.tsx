import { useEffect, useMemo, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-python'

import { IconButton } from './IconButton'
import { IconCopy } from './icons'
import { copyToClipboard } from '../lib/clipboard'

export function CodeBlock(props: { code: string; language: string; title?: string }) {
  const ref = useRef<HTMLElement | null>(null)
  const [copied, setCopied] = useState(false)

  const lang = useMemo(() => {
    const l = props.language.toLowerCase().trim()
    if (l === 'js') return 'javascript'
    if (l === 'ts') return 'typescript'
    if (l === 'sh' || l === 'shell') return 'bash'
    if (l === 'html' || l === 'xml') return 'markup'
    return l || 'typescript'
  }, [props.language])

  useEffect(() => {
    if (!ref.current) return
    Prism.highlightElement(ref.current)
  }, [props.code, lang])

  async function onCopy() {
    const ok = await copyToClipboard(props.code)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 900)
  }

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panelHeader">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {props.title ?? 'Snippet'}
          </div>
          <span className="pill">{lang}</span>
        </div>
        <IconButton label={copied ? 'Copied' : 'Copy'} onClick={onCopy} kind={copied ? 'primary' : 'default'}>
          <IconCopy />
        </IconButton>
      </div>
      <div className="panelBody" style={{ padding: 0 }}>
        <pre style={{ margin: 0, padding: 14, overflowX: 'auto' }}>
          <code
            ref={(el) => {
              ref.current = el
            }}
            className={`language-${lang}`}
          >
            {props.code}
          </code>
        </pre>
      </div>
    </div>
  )
}


