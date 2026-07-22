import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username, password)
      localStorage.setItem('auth_token', data.access_token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split-layout">
      {/* Left Branding Side */}
      <div className="split-left">
         <div className="branding">Skill<span>Sync</span></div>
         <div className="split-left-content">
            <h2>Welcome to the<br/>SkillSync Hub</h2>
            <p style={{ opacity: 0.9, lineHeight: 1.6, maxWidth: 300, fontSize: 16 }}>
              The premium platform for assessing, shortlisting, and hiring the best global talent seamlessly.
            </p>
         </div>
         <div style={{ opacity: 0.5, fontSize: 13 }}>© 2026 SkillSync Enterprise Solutions</div>
      </div>

      {/* Right Login Side */}
      <div className="split-right">
        <div className="login-form-wrap">
          <h1>Consultancy Login</h1>
          <p className="sub">See what is going on with your business</p>
  
          {error && <div className="login-error">{error}</div>}
  
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email / Username</label>
              <input
                id="login-username"
                className="form-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="form-group mb-6">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
            </div>
            <button id="login-submit" className={`btn btn-primary btn-lg w-full ${loading ? ' btn-loading' : ''}`} type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in…</> : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
