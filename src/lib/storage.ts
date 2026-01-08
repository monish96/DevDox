import { useSyncExternalStore } from 'react'
import type { AppState } from './types'

const STORAGE_KEY = 'devdoc:v1'
const EVENT_NAME = 'devdoc:storage'

const DEFAULT_COLUMNS = [
  { id: 'col_todo', title: 'Todo', order: 1, isSystem: true, createdAt: 0, updatedAt: 0 },
  { id: 'col_doing', title: 'Doing', order: 2, isSystem: true, createdAt: 0, updatedAt: 0 },
  { id: 'col_done', title: 'Done', order: 3, isSystem: true, createdAt: 0, updatedAt: 0 },
]

const DUMMY_TODO_ID = 'todo_welcome'

function defaultState(): AppState {
  return {
    version: 1,
    userName: undefined,
    securityBannerDismissed: false,
    todoViewMode: 'kanban',
    backupEnabled: true,
    backupIntervalHours: 24,
    backupLastAt: undefined,
    pomodoroFocusMinutes: 30,
    searchShortcutEnabled: true,
    todos: [
      {
        id: DUMMY_TODO_ID,
        title: 'Welcome! Create your first todo with the + button (or Ctrl/Cmd+Alt+T).',
        description: 'Tip: Drag cards between columns. Edit or delete this card anytime.',
        tags: ['welcome'],
        priority: 'medium',
        columnId: 'col_todo',
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    todoColumns: DEFAULT_COLUMNS.slice(),
    notes: [],
    snippets: [],
    voiceDocs: [],
    diagrams: [],
  }
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return defaultState()
  const r = raw as Partial<AppState>
  if (r.version !== 1) return defaultState()
  const now = Date.now()

  const incomingColumns = Array.isArray((r as any).todoColumns) ? ((r as any).todoColumns as any[]) : []
  let todoColumns =
    incomingColumns.length > 0
      ? incomingColumns.map((c: any, i: number) => ({
          id: String(c?.id ?? `col_${now}_${i}`),
          title: String(c?.title ?? 'Column'),
          order: typeof c?.order === 'number' ? c.order : now + i,
          isSystem:
            typeof c?.isSystem === 'boolean'
              ? c.isSystem
              : ['todo', 'doing', 'done'].includes(String(c?.title ?? '').toLowerCase()),
          createdAt: typeof c?.createdAt === 'number' ? c.createdAt : now,
          updatedAt: typeof c?.updatedAt === 'number' ? c.updatedAt : now,
        }))
      : []

  // Back-compat: older versions had fixed statuses. Create default columns.
  if (todoColumns.length === 0) {
    todoColumns = [
      { id: 'col_todo', title: 'Todo', order: now + 1, isSystem: true, createdAt: now, updatedAt: now },
      { id: 'col_doing', title: 'Doing', order: now + 2, isSystem: true, createdAt: now, updatedAt: now },
      { id: 'col_done', title: 'Done', order: now + 3, isSystem: true, createdAt: now, updatedAt: now },
    ]
  }

  const byTitle = new Map(todoColumns.map((c) => [c.title.toLowerCase(), c.id]))
  const todoId = byTitle.get('todo') ?? todoColumns[0].id
  const doingId = byTitle.get('doing') ?? todoColumns[Math.min(1, todoColumns.length - 1)].id
  const doneId = byTitle.get('done') ?? todoColumns[todoColumns.length - 1].id

  return {
    version: 1,
    userName: typeof (r as any).userName === 'string' ? (r as any).userName : undefined,
    securityBannerDismissed: typeof (r as any).securityBannerDismissed === 'boolean' ? (r as any).securityBannerDismissed : false,
    todoViewMode: (r as any).todoViewMode === 'checklist' || (r as any).todoViewMode === 'kanban' ? (r as any).todoViewMode : 'kanban',
    backupEnabled: typeof (r as any).backupEnabled === 'boolean' ? (r as any).backupEnabled : true,
    backupIntervalHours: typeof (r as any).backupIntervalHours === 'number' ? (r as any).backupIntervalHours : 24,
    backupLastAt: typeof (r as any).backupLastAt === 'number' ? (r as any).backupLastAt : undefined,
    pomodoroFocusMinutes:
      typeof (r as any).pomodoroFocusMinutes === 'number' && Number.isFinite((r as any).pomodoroFocusMinutes)
        ? Math.max(5, Math.min(180, Math.round((r as any).pomodoroFocusMinutes)))
        : 30,
    searchShortcutEnabled: typeof (r as any).searchShortcutEnabled === 'boolean' ? (r as any).searchShortcutEnabled : true,
    todos: Array.isArray(r.todos)
      ? r.todos.map((t: any, i: number) => ({
          ...t,
          order: typeof t?.order === 'number' ? t.order : (typeof t?.createdAt === 'number' ? t.createdAt : now + i),
          archivedAt: typeof t?.archivedAt === 'number' ? t.archivedAt : undefined,
          description: typeof t?.description === 'string' ? t.description : '',
          tags: Array.isArray(t?.tags) ? t.tags.filter((x: any) => typeof x === 'string') : [],
          completedAt: typeof t?.completedAt === 'number' ? t.completedAt : undefined,
          important: typeof t?.important === 'boolean' ? t.important : false,
          priority:
            t?.priority === 'lowest' || t?.priority === 'low' || t?.priority === 'medium' || t?.priority === 'high' || t?.priority === 'highest'
              ? t.priority
              : 'medium',
          columnId:
            typeof t?.columnId === 'string'
              ? t.columnId
              : t?.status === 'doing'
                ? doingId
                : t?.status === 'done'
                  ? doneId
                  : todoId,
        }))
      : [],
    todoColumns,
    notes: Array.isArray(r.notes)
      ? r.notes.map((n: any, i: number) => ({
          ...n,
          // Back-compat: older notes didn't have parentId/order
          order: typeof n?.order === 'number' ? n.order : now + i,
          parentId: typeof n?.parentId === 'string' ? n.parentId : undefined,
        }))
      : [],
    snippets: Array.isArray(r.snippets) ? r.snippets : [],
    voiceDocs: Array.isArray(r.voiceDocs) ? r.voiceDocs : [],
    diagrams: Array.isArray((r as any).diagrams)
      ? ((r as any).diagrams as any[]).map((d: any, i: number) => {
          const base = {
            id: String(d?.id ?? `diag_${now}_${i}`),
            title: String(d?.title ?? 'Diagram'),
            svg: typeof d?.svg === 'string' ? d.svg : '',
            archivedAt: typeof d?.archivedAt === 'number' ? d.archivedAt : undefined,
            createdAt: typeof d?.createdAt === 'number' ? d.createdAt : now,
            updatedAt: typeof d?.updatedAt === 'number' ? d.updatedAt : now,
          }

          // Back-compat: old diagrams were Mermaid only and didn't have a kind field.
          const kind: 'canvas' | 'mermaid' =
            d?.kind === 'canvas' || d?.kind === 'mermaid'
              ? d.kind
              : typeof d?.scene === 'string'
                ? 'canvas'
                : 'mermaid'
          if (kind === 'canvas') {
            return {
              ...base,
              kind: 'canvas',
              scene: typeof d?.scene === 'string' ? d.scene : '',
            }
          }
          return {
            ...base,
            kind: 'mermaid',
            code: typeof d?.code === 'string' ? d.code : '',
          }
        })
      : [],
  }
}

let cachedJson: string | null = null
let cachedState: AppState = defaultState()

export function getState(): AppState {
  const json = localStorage.getItem(STORAGE_KEY)
  if (json === cachedJson) return cachedState
  if (!json) {
    // Keep a stable in-memory snapshot when storage is empty (important for first-run UX).
    if (cachedJson === null) return cachedState
    cachedJson = null
    cachedState = defaultState()
    return cachedState
  }

  cachedJson = json
  cachedState = normalizeState(safeParse(json))
  return cachedState
}

export function setState(updater: (prev: AppState) => AppState): void {
  let next = updater(getState())
  // Make the welcome dummy todo truly "first-time": once any real todo exists, drop it.
  if (Array.isArray(next.todos) && next.todos.some((t) => t?.id && t.id !== DUMMY_TODO_ID)) {
    next = { ...next, todos: next.todos.filter((t) => t.id !== DUMMY_TODO_ID) }
  }
  const json = JSON.stringify(next)
  cachedJson = json
  cachedState = next
  localStorage.setItem(STORAGE_KEY, json)
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function exportStateJson(pretty = true): string {
  return JSON.stringify(getState(), null, pretty ? 2 : 0)
}

export function importStateJson(json: string): void {
  const next = normalizeState(safeParse(json))
  const nextJson = JSON.stringify(next)
  cachedJson = nextJson
  cachedState = next
  localStorage.setItem(STORAGE_KEY, nextJson)
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function subscribe(cb: () => void): () => void {
  const onCustom = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    // Keep cache in sync across tabs/windows.
    cachedJson = e.newValue
    cachedState = e.newValue ? normalizeState(safeParse(e.newValue)) : defaultState()
    cb()
  }

  window.addEventListener(EVENT_NAME, onCustom as EventListener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom as EventListener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(defaultState()),
  )
}


