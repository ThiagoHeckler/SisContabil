import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, FileSpreadsheet, Search, Menu, X, BookOpen, Percent
} from 'lucide-react'
import './Layout.css'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/difal',     icon: Calculator,      label: 'Calc. DIFAL' },
  { to: '/nfe',       icon: FileSpreadsheet, label: 'Conversor NF-e' },
  { to: '/ncm',       icon: Search,          label: 'Consultor NCM' },
  { to: '/pis-cofins',icon: Percent,         label: 'PIS/COFINS' },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-logo">
          <BookOpen size={22} />
          <span>Sis<strong>Contabil</strong></span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                'nav-item' + (isActive ? ' nav-item--active' : '')
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>v0.1.0</span>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="topbar-menu btn btn-ghost" onClick={() => setOpen(o => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="topbar-title">SisContabil</span>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
