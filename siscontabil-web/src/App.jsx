import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Dashboard from './pages/Dashboard'
import DifalCalculator from './pages/difal/DifalCalculator'
import NfeConverter from './pages/nfe/NfeConverter'
import NcmConsultor from './pages/ncm/NcmConsultor'
import PisCofinsAjuste from './pages/pis-cofins/PisCofinsAjuste'
import SpedImport from './pages/sped/SpedImport'

function TelaCarregando() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--muted)',
    }}>
      Carregando…
    </div>
  )
}

export default function App() {
  const { user, carregando } = useAuth()

  if (carregando) return <TelaCarregando />

  if (!user) {
    // Sem sessão: só a tela de login é acessível.
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Autenticado: app completo. /login redireciona para a home.
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/difal" element={<DifalCalculator />} />
        <Route path="/nfe" element={<NfeConverter />} />
        <Route path="/ncm" element={<NcmConsultor />} />
        <Route path="/pis-cofins" element={<PisCofinsAjuste />} />
        <Route path="/sped" element={<SpedImport />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
