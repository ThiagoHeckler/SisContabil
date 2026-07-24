import { Link } from 'react-router-dom'
import { Calculator, FileSpreadsheet, Search, Percent, FileCheck2, ArrowRight } from 'lucide-react'
import './Dashboard.css'

const MODULES = [
  {
    to: '/difal',
    icon: Calculator,
    color: '#1a7a4a',
    bg: '#f0faf5',
    title: 'Calculadora DIFAL',
    desc: 'Cálculo do Diferencial de Alíquota por dentro para operações com destino ao Mato Grosso.',
  },
  {
    to: '/nfe',
    icon: FileSpreadsheet,
    color: '#1d4ed8',
    bg: '#eff6ff',
    title: 'Conversor NF-e',
    desc: 'Importe XMLs de NF-e e exporte os dados em planilha Excel (.xlsx) pronta para análise.',
  },
  {
    to: '/ncm',
    icon: Search,
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: 'Consultor NCM',
    desc: 'Pesquise códigos NCM por número ou descrição e veja alíquotas e enquadramento fiscal.',
  },
  {
    to: '/pis-cofins',
    icon: Percent,
    color: '#b45309',
    bg: '#fffbeb',
    title: 'Ajuste de PIS e COFINS',
    desc: 'Importe uma planilha de itens (código, NCM, descrição) e identifique os enquadramentos de alíquota zero por NCM.',
  },
  {
    to: '/sped',
    icon: FileCheck2,
    color: '#0f766e',
    bg: '#f0fdfa',
    title: 'Importação SPED',
    desc: 'Confira quais XMLs de NF-e correspondem a uma lista de chaves de acesso e baixe os conferidos em um ZIP.',
  },
]

export default function Dashboard() {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bem-vindo ao SisContabil — selecione um módulo para começar.</p>
      </div>

      <div className="module-grid">
        {MODULES.map(({ to, icon: Icon, color, bg, title, desc }) => (
          <Link key={to} to={to} className="module-card">
            <div className="module-card__icon" style={{ background: bg, color }}>
              <Icon size={28} />
            </div>
            <div className="module-card__body">
              <div className="module-card__header">
                <h2>{title}</h2>
                <span className="badge badge-green">Ativo</span>
              </div>
              <p>{desc}</p>
            </div>
            <ArrowRight size={18} className="module-card__arrow" />
          </Link>
        ))}
      </div>

      <div className="dashboard-info">
        <p>SisContabil v0.1.0 &mdash; Ferramentas para escritórios de contabilidade em MT</p>
      </div>
    </div>
  )
}
