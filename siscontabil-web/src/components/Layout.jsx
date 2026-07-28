import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calculator, FileSpreadsheet, Search, Menu, X, BookOpen, Percent,
  LogOut, User as UserIcon, FileCheck2, Sun, Moon
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import './Layout.css'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/difal',     icon: Calculator,      label: 'Calc. DIFAL' },
  { to: '/nfe',       icon: FileSpreadsheet, label: 'Conversor NF-e' },
  { to: '/ncm',       icon: Search,          label: 'Consultor NCM' },
  { to: '/pis-cofins',icon: Percent,         label: 'PIS/COFINS' },
  { to: '/sped',      icon: FileCheck2,      label: 'Importação SPED' },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()

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
          {user && (
            <div className="sidebar-user">
              <UserIcon size={16} />
              <span className="sidebar-user__name" title={user.email}>{user.name}</span>
            </div>
          )}
          <button className="nav-item nav-item--theme" onClick={toggle}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button className="nav-item nav-item--logout" onClick={logout}>
            <LogOut size={18} /> Sair
          </button>
          <span className="sidebar-version">v0.1.0</span>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="topbar-menu btn btn-ghost" onClick={() => setOpen(o => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="topbar-title">SisContabil</span>
          <button
            className="topbar-theme"
            onClick={toggle}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
