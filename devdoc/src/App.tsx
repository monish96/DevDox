import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { NotesPage } from './pages/NotesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodosPage } from './pages/TodosPage'
import { ToolsPage } from './pages/ToolsPage'
import { VoiceDocsPage } from './pages/VoiceDocsPage'

const DiagramsPage = lazy(() =>
  import('./pages/DiagramsPage').then((m) => ({ default: m.DiagramsPage })),
)

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route
          path="/diagrams"
          element={
            <Suspense fallback={<div className="container muted">Loading diagrams…</div>}>
              <DiagramsPage />
            </Suspense>
          }
        />
        <Route path="/voice" element={<VoiceDocsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
