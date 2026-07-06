import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './components/Shell'
import DisplaysPage from './pages/DisplaysPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/admin/displays" replace />} />
        <Route path="/admin/displays" element={<DisplaysPage />} />
        <Route path="*" element={<Navigate to="/admin/displays" replace />} />
      </Route>
    </Routes>
  )
}
