import { useNavigate, useLocation } from 'react-router-dom'

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
  const isCandidate = location.pathname.startsWith('/candidate')
  const candUser = JSON.parse(localStorage.getItem('candidate_user') || '{}')
  
  const displayName = isCandidate ? candUser.display_name : user.display_name

  const handleLogout = () => {
    if (isCandidate) {
      window.dispatchEvent(new Event('candidate:logout'))
    } else {
      window.dispatchEvent(new Event('auth:logout'))
    }
  }

  return (
    <div className="top-nav">
      <div className="logo cursor-pointer" onClick={() => navigate(isCandidate ? '/candidate/dashboard' : '/admin/dashboard')} style={{ cursor: 'pointer' }}>
        Skill<span>Sync</span>
      </div>
      
      <div className="nav-links">
        <button 
          className={location.pathname.endsWith('/dashboard') ? 'active' : ''} 
          onClick={() => navigate(isCandidate ? '/candidate/dashboard' : '/admin/dashboard')}
        >
          {isCandidate ? 'Home' : 'Home'}
        </button>
        {isCandidate && (
          <button 
            className={location.pathname.includes('/cv-analyzer') ? 'active' : ''} 
            onClick={() => navigate('/candidate/cv-analyzer')}
          >
            CV Analyzer
          </button>
        )}
        {!isCandidate && (
          <>
            <button className={location.pathname.includes('/candidates') ? 'active' : ''} onClick={() => navigate('/admin/candidates')}>Candidates</button>
            <button className={location.pathname.includes('/post-job') ? 'active' : ''} onClick={() => navigate('/admin/post-job')}>Post Job</button>
            <button className={location.pathname.includes('/analytics') ? 'active' : ''} onClick={() => navigate('/admin/analytics')}>Analytics</button>
            <button 
              className="mono" 
              style={{ opacity: 0.7, fontSize: '12px' }}
              onClick={() => window.open('/db-explorer/', '_blank')}
            >
              DB EXPLORER //
            </button>
          </>
        )}

      </div>

      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
        <div className="flex items-center gap-2" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>{displayName || 'User'}</span>
        </div>
      </div>
    </div>
  )
}
