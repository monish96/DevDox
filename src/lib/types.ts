export type ISODate = string // YYYY-MM-DD

export type TodoStatus = 'todo' | 'doing' | 'done'

export type TodoColumn = {
  id: string
  title: string
  order: number
  /** True for built-in columns (Todo/Doing/Done). Only non-system columns can be deleted. */
  isSystem?: boolean
  createdAt: number
  updatedAt: number
}

export type Todo = {
  id: string
  title: string
  /** Legacy field (pre-kanban). Kept for migration/back-compat. */
  status?: TodoStatus
  /** Kanban column id */
  columnId?: string
  description?: string
  tags?: string[]
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  dueDate?: ISODate
  archivedAt?: number
  order?: number
  createdAt: number
  updatedAt: number
}

export type Note = {
  id: string
  title: string
  body: string
  parentId?: string
  order: number
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type Snippet = {
  id: string
  title: string
  language: string
  code: string
  tags: string[]
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type VoiceDoc = {
  id: string
  title: string
  rawText: string
  summary: string
  archivedAt?: number
  createdAt: number
  updatedAt: number
}

export type DiagramKind = 'canvas' | 'mermaid'

export type Diagram =
  | {
      id: string
      title: string
      kind: 'mermaid'
      code: string
      /** Cached SVG output for fast thumbnails/list preview */
      svg: string
      archivedAt?: number
      createdAt: number
      updatedAt: number
    }
  | {
      id: string
      title: string
      kind: 'canvas'
      /** Excalidraw scene JSON string */
      scene: string
      /** Cached SVG output for fast thumbnails/list preview */
      svg: string
      archivedAt?: number
      createdAt: number
      updatedAt: number
    }

export type AppState = {
  version: 1
  userName?: string
  /** One-time security banner dismissal flag */
  securityBannerDismissed?: boolean
  backupEnabled?: boolean
  backupIntervalHours?: number
  backupLastAt?: number
  pomodoroFocusMinutes?: number
  searchShortcutEnabled?: boolean
  todos: Todo[]
  todoColumns: TodoColumn[]
  notes: Note[]
  snippets: Snippet[]
  voiceDocs: VoiceDoc[]
  diagrams: Diagram[]
}


