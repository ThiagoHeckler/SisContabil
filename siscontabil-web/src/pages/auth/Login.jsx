import { useState } from 'react'
import { BookOpen, LogIn, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [erro,     setErro]     = useState('')
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await login(email.trim(), password)
      // sucesso: o AuthProvider atualiza o user e o App troca de rota
    } catch (err) {
      setErro(err.message || 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <BookOpen size={28} />
          <span>Sis<strong>Contabil</strong></span>
        </div>
        <p className="login-sub">Entre para acessar o sistema</p>

        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            autoComplete="username"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {erro && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {erro}
          </div>
        )}

        <button className="btn btn-primary login-btn" type="submit" disabled={enviando}>
          {enviando
            ? <><Loader2 size={16} className="spin-icon" /> Entrando…</>
            : <><LogIn size={16} /> Entrar</>
          }
        </button>
      </form>
    </div>
  )
}
