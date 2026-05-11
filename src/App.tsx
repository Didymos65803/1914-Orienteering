import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { CheckpointPage } from './pages/CheckpointPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { SkillPage } from './pages/SkillPage'
import { VotePage } from './pages/VotePage'
import { getStoredTeamId } from './lib/session'

function RequireTeam({ children }: { children: ReactNode }) {
  return getStoredTeamId() ? children : <Navigate to="/login" replace />
}

const routerBasename =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/map"
          element={
            <RequireTeam>
              <MapPage />
            </RequireTeam>
          }
        />
        <Route
          path="/checkpoint/:cpId"
          element={
            <RequireTeam>
              <CheckpointPage />
            </RequireTeam>
          }
        />
        <Route
          path="/skill"
          element={
            <RequireTeam>
              <SkillPage />
            </RequireTeam>
          }
        />
        <Route
          path="/vote"
          element={
            <RequireTeam>
              <VotePage />
            </RequireTeam>
          }
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
