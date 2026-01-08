import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSearchParams } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { TodoCreateDrawer, type TodoDraft } from '../components/TodoCreateDrawer'
import { IconEdit, IconPlus, IconSave, IconTrash, IconX } from '../components/icons'
import { newId } from '../lib/id'
import { setState, useAppState } from '../lib/storage'
import type { Todo, TodoColumn } from '../lib/types'

export function TodosPage() {
  const [searchParams] = useSearchParams()
  const todos = useAppState((s) => s.todos)
  const columns = useAppState((s) => s.todoColumns)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newDraft, setNewDraft] = useState<TodoDraft>({
    title: '',
    description: '',
    dueDate: '',
    tags: '',
    priority: 'medium',
  })
  const [modalTodoId, setModalTodoId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view')
  const [editTitle, setEditTitle] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editPriority, setEditPriority] = useState<Todo['priority']>('medium')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visibleColumns = useMemo(
    () => columns.slice().sort((a, b) => a.order - b.order),
    [columns],
  )

  const todoColumnId = useMemo(() => {
    return visibleColumns.find((c) => c.title.toLowerCase() === 'todo')?.id ?? visibleColumns[0]?.id ?? null
  }, [visibleColumns])

  const doneColumnIds = useMemo(() => {
    return new Set(visibleColumns.filter((c) => c.title.toLowerCase() === 'done').map((c) => c.id))
  }, [visibleColumns])

  const byCol = useMemo(() => {
    const map = new Map<string, Todo[]>()
    for (const c of visibleColumns) map.set(c.id, [])
    for (const t of todos) {
      if (t.archivedAt) continue
      const colId = t.columnId ?? visibleColumns[0]?.id
      if (!colId) continue
      if (!map.has(colId)) map.set(colId, [])
      map.get(colId)!.push(t)
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
      map.set(k, arr)
    }
    return map
  }, [todos, visibleColumns])

  function parseTags(s: string): string[] {
    return s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 10)
  }

  function addTodoToTodoColumn() {
    if (!todoColumnId) return
    const trimmed = newDraft.title.trim()
    if (!trimmed) return
    const now = Date.now()
    const list = byCol.get(todoColumnId) ?? []
    const max = Math.max(0, ...list.map((t) => t.order ?? t.createdAt))
    const todo: Todo = {
      id: newId('todo'),
      title: trimmed,
      columnId: todoColumnId,
      dueDate: newDraft.dueDate.trim() || undefined,
      description: newDraft.description.trim() || '',
      tags: parseTags(newDraft.tags),
      priority: newDraft.priority ?? 'medium',
      order: max + 1,
      createdAt: now,
      updatedAt: now,
    }
    setState((prev) => ({ ...prev, todos: [todo, ...prev.todos] }))
    setNewDraft({ title: '', description: '', dueDate: '', tags: '', priority: 'medium' })
    setNewOpen(false)
  }

  function removeTodo(id: string) {
    setState((prev) => ({ ...prev, todos: prev.todos.filter((t) => t.id !== id) }))
  }

  function updateTodo(id: string, patch: Partial<Todo>) {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)),
    }))
  }

  function openTodoModal(todo: Todo, mode: 'view' | 'edit') {
    setModalTodoId(todo.id)
    setModalMode(mode)
    setEditTitle(todo.title ?? '')
    setEditDue(todo.dueDate ?? '')
    setEditDesc(todo.description ?? '')
    setEditTags((todo.tags ?? []).join(', '))
    setEditPriority(todo.priority ?? 'medium')
  }

  const lastAutoOpenedRef = useRef<string | null>(null)
  useEffect(() => {
    const id = searchParams.get('todoId')
    if (!id) return
    if (lastAutoOpenedRef.current === id) return
    const t = todos.find((x) => x.id === id)
    if (!t) return
    lastAutoOpenedRef.current = id
    openTodoModal(t, 'view')
  }, [searchParams, todos])

  const modalTodo = useMemo(() => (modalTodoId ? todos.find((t) => t.id === modalTodoId) ?? null : null), [modalTodoId, todos])

  function closeTodoModal() {
    setModalTodoId(null)
    setModalMode('view')
  }

  useEffect(() => {
    if (!modalTodoId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeTodoModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalTodoId])

  useEffect(() => {
    // If the todo got deleted while modal is open, close it.
    if (modalTodoId && !modalTodo) closeTodoModal()
  }, [modalTodoId, modalTodo])

  function saveEdit() {
    if (!modalTodoId) return
    const title = editTitle.trim()
    if (!title) return
    updateTodo(modalTodoId, {
      title,
      dueDate: editDue.trim() || undefined,
      description: editDesc.trim() || '',
      tags: parseTags(editTags),
      priority: editPriority ?? 'medium',
    })
    setModalMode('view')
  }

  function enterEditMode() {
    if (!modalTodo) return
    openTodoModal(modalTodo, 'edit')
  }

  function cancelEditMode() {
    if (!modalTodo) {
      closeTodoModal()
      return
    }
    // Revert edits back to current persisted values.
    openTodoModal(modalTodo, 'view')
  }

  function findColumnForTodo(id: string): string | null {
    for (const [colId, list] of byCol) {
      if (list.some((t) => t.id === id)) return colId
    }
    return null
  }

  function reindex(list: Todo[]): Array<{ id: string; order: number }> {
    const base = Date.now()
    return list.map((t, idx) => ({ id: t.id, order: base + idx }))
  }

  function setOrders(patches: Array<{ id: string; columnId?: string; order?: number }>) {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => {
        const p = patches.find((x) => x.id === t.id)
        return p ? { ...t, ...p, updatedAt: Date.now() } : t
      }),
    }))
  }

  const activeTodo = useMemo(() => (activeId ? todos.find((t) => t.id === activeId) ?? null : null), [activeId, todos])

  return (
    <div className="container col">
      <div className="panel">
        <div className="panelHeader">
          <div style={{ fontWeight: 750 }}>Todos</div>
          <div className="row" style={{ gap: 8 }}>
            <IconButton
              label="New todo"
              kind="primary"
              onClick={() => {
                setNewOpen(true)
              }}
            >
              <IconPlus />
            </IconButton>
          </div>
        </div>
        <div className="panelBody">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActiveId(String(active.id))}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={({ active, over }) => {
              setActiveId(null)
              if (!over) return
              const activeId = String(active.id)
              const overId = String(over.id)
              if (activeId === overId) return

              const fromCol = findColumnForTodo(activeId)
              const toCol =
                overId.startsWith('col:')
                  ? overId.slice('col:'.length)
                  : findColumnForTodo(overId)

              if (!fromCol || !toCol) return

              const fromList = (byCol.get(fromCol) ?? []).slice()
              const toList = fromCol === toCol ? fromList : (byCol.get(toCol) ?? []).slice()

              const fromIndex = fromList.findIndex((t) => t.id === activeId)
              if (fromIndex < 0) return
              const moving = fromList[fromIndex]

              // Remove from source
              fromList.splice(fromIndex, 1)

              // Insert into target
              let toIndex = toList.length
              if (!overId.startsWith('col:')) {
                const idx = toList.findIndex((t) => t.id === overId)
                if (idx >= 0) toIndex = idx
              }
              toList.splice(toIndex, 0, { ...moving, columnId: toCol })

              // Reindex orders in affected columns
              const patches: Array<{ id: string; columnId?: string; order?: number }> = []
              for (const p of reindex(toList)) patches.push({ id: p.id, columnId: toCol, order: p.order })
              if (fromCol !== toCol) {
                for (const p of reindex(fromList)) patches.push({ id: p.id, columnId: fromCol, order: p.order })
              }
              setOrders(patches)
            }}
          >
            <div className="kanban">
              {visibleColumns.map((c) => (
                <KanbanColumn
                  key={c.id}
                  column={c}
                  todos={byCol.get(c.id) ?? []}
                  onRemove={removeTodo}
                  onOpen={(todo) => openTodoModal(todo, 'view')}
                  onEdit={(todo) => openTodoModal(todo, 'edit')}
                  doneColumnIds={doneColumnIds}
                  isDragging={!!activeId}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
              {activeTodo ? (
                <div className="kanbanCard dragOverlay">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                    <div className="kanbanCardTitle">{activeTodo.title}</div>
                  </div>
                  <div className="kanbanCardMeta">
                    <div className="jiraMeta">
                      <span className={`prioDot prio_${(activeTodo.priority ?? 'medium')}`.trim()} />
                      {(activeTodo.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="tagChip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {activeTodo.dueDate ? <span className="pill">{activeTodo.dueDate}</span> : null}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <TodoCreateDrawer
        open={newOpen}
        heading="New Todo"
        draft={newDraft}
        onChange={(patch) => setNewDraft((d) => ({ ...d, ...patch }))}
        onClose={() => setNewOpen(false)}
        onSubmit={addTodoToTodoColumn}
      />
      {!todoColumnId ? <div className="muted" style={{ marginTop: 10 }}>No columns found — create a column first.</div> : null}

      {modalTodoId && modalTodo ? (
        <div
          className="drawerOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={modalMode === 'edit' ? 'Edit todo' : 'View todo'}
          onMouseDown={closeTodoModal}
        >
          <div className="panel drawerPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="panelHeader">
              <div style={{ fontWeight: 650 }}>{modalMode === 'edit' ? 'Edit Todo' : 'Todo'}</div>
              <IconButton label="Close" onClick={closeTodoModal}>
                <IconX />
              </IconButton>
            </div>

            <div className="panelBody col" style={{ gap: 10 }}>
              {modalMode === 'edit' ? (
                <>
                  <input
                    className="input"
                    placeholder="Title"
                    value={editTitle}
                    autoFocus
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                    }}
                  />
                  <textarea
                    className="input"
                    placeholder="Description"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={6}
                    style={{ resize: 'vertical' }}
                  />
                  <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
                    <input
                      className="input"
                      type="date"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      title="Due date"
                      style={{ maxWidth: 200 }}
                    />
                    <select
                      className="input"
                      value={editPriority ?? 'medium'}
                      onChange={(e) => setEditPriority(e.target.value as Todo['priority'])}
                      title="Priority"
                      style={{ maxWidth: 220 }}
                    >
                      <option value="lowest">Lowest</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="highest">Highest</option>
                    </select>
                  </div>
                  <input
                    className="input"
                    placeholder="Tags (comma separated)"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                  />

                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <IconButton
                      label="Delete"
                      kind="danger"
                      onClick={() => {
                        removeTodo(modalTodoId)
                        closeTodoModal()
                      }}
                    >
                      <IconTrash />
                    </IconButton>
                    <div className="row" style={{ gap: 8 }}>
                      <IconButton label="Cancel" onClick={cancelEditMode}>
                        <IconX />
                      </IconButton>
                      <IconButton label="Save" kind="primary" onClick={saveEdit}>
                        <IconSave />
                      </IconButton>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col" style={{ gap: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{modalTodo.title}</div>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="pill">{modalTodo.dueDate ? `Due ${modalTodo.dueDate}` : 'No due date'}</span>
                      <span className="pill">{`Priority: ${modalTodo.priority ?? 'medium'}`}</span>
                      {(modalTodo.tags ?? []).slice(0, 8).map((t) => (
                        <span key={t} className="tagChip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {(modalTodo.description ?? '').trim() ? (
                    <div className="muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                      {(modalTodo.description ?? '').trim()}
                    </div>
                  ) : (
                    <div className="muted">No description.</div>
                  )}

                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <IconButton
                      label="Delete"
                      kind="danger"
                      onClick={() => {
                        removeTodo(modalTodoId)
                        closeTodoModal()
                      }}
                    >
                      <IconTrash />
                    </IconButton>
                    <IconButton label="Edit" kind="primary" onClick={enterEditMode}>
                      <IconEdit />
                    </IconButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function KanbanColumn(props: {
  column: TodoColumn
  todos: Todo[]
  onRemove: (id: string) => void
  onOpen: (todo: Todo) => void
  onEdit: (todo: Todo) => void
  doneColumnIds: Set<string>
  isDragging: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${props.column.id}` })

  return (
    <div className="kanbanCol">
      <div className="kanbanColHeader">
        <div className="kanbanColTitle">{props.column.title}</div>
        <span className="pill">{props.todos.length}</span>
      </div>
      <div className={`kanbanCards ${(props.isDragging && isOver) ? 'dropTarget' : ''}`.trim()} ref={setNodeRef}>
        <SortableContext items={props.todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {props.todos.map((t) => (
            <KanbanCard
              key={t.id}
              todo={t}
              isDone={props.doneColumnIds.has(props.column.id)}
              onRemove={props.onRemove}
              onOpen={props.onOpen}
              onEdit={props.onEdit}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function today(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function KanbanCard(props: {
  todo: Todo
  isDone: boolean
  onRemove: (id: string) => void
  onOpen: (todo: Todo) => void
  onEdit: (todo: Todo) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.todo.id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    opacity: isDragging ? 0.75 : 1,
  }

  const due = props.todo.dueDate
  const overdue = !!due && !props.isDone && due < today()
  const tags = props.todo.tags ?? []
  const prio = props.todo.priority ?? 'medium'
  const desc = (props.todo.description ?? '').trim()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanbanCard"
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return
        props.onOpen(props.todo)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          props.onOpen(props.todo)
        }
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <div className="kanbanCardTitle">{props.todo.title}</div>
        <div className="row" style={{ gap: 6 }}>
          <span onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <IconButton label="Edit" onClick={() => props.onEdit(props.todo)}>
              <IconEdit />
            </IconButton>
          </span>
          <span onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <IconButton label="Delete" kind="danger" onClick={() => props.onRemove(props.todo.id)}>
              <IconTrash />
            </IconButton>
          </span>
        </div>
      </div>
      {desc ? (
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
          {desc}
        </div>
      ) : null}
      <div className="kanbanCardMeta">
        <div className="jiraMeta">
          <span className={`prioDot prio_${prio}`.trim()} title={`Priority: ${prio}`} />
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tagChip" title={tag}>
              {tag}
            </span>
          ))}
        </div>
        {due ? <span className={`pill ${overdue ? 'dueRed' : ''}`.trim()}>{due}</span> : null}
      </div>
    </div>
  )
}


