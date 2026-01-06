import { exportStateJson, importStateJson } from './storage'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function downloadSession(): void {
  const json = exportStateJson(true)
  const d = new Date()
  const name = `devdox-session-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function readTextFile(file: File): Promise<string> {
  return await file.text()
}

export async function importSessionFile(file: File): Promise<void> {
  const text = await readTextFile(file)
  // Validate before importing so bad files don't silently reset the app.
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file.')
  }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
    throw new Error('Not a valid DevDox session file (expected version 1).')
  }
  importStateJson(text)
}


