import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DifalCalculator from './pages/difal/DifalCalculator'
import NfeConverter from './pages/nfe/NfeConverter'
import NcmConsultor from './pages/ncm/NcmConsultor'
import PisCofinsAjuste from './pages/pis-cofins/PisCofinsAjuste'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/difal" element={<DifalCalculator />} />
        <Route path="/nfe" element={<NfeConverter />} />
        <Route path="/ncm" element={<NcmConsultor />} />
        <Route path="/pis-cofins" element={<PisCofinsAjuste />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
