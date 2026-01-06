type MermaidModule = typeof import('mermaid').default

let mermaidModPromise: Promise<MermaidModule> | null = null
let lastTheme: 'default' | 'dark' | null = null

async function getMermaid(): Promise<MermaidModule> {
  if (!mermaidModPromise) {
    mermaidModPromise = import('mermaid').then((m) => m.default)
  }
  return mermaidModPromise
}

async function ensureMermaidConfigured() {
  const mermaid = await getMermaid()
  const theme = document.documentElement.dataset.theme === 'light' ? 'default' : 'dark'
  if (lastTheme === theme) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme,
  })
  lastTheme = theme
}

export async function renderMermaid(code: string): Promise<{ svg: string; error?: string }> {
  try {
    const mermaid = await getMermaid()
    await ensureMermaidConfigured()
    const id = `m_${Math.random().toString(36).slice(2)}`
    const { svg } = await mermaid.render(id, code)
    return { svg }
  } catch (e: any) {
    return { svg: '', error: e?.message ? String(e.message) : 'Render failed' }
  }
}


