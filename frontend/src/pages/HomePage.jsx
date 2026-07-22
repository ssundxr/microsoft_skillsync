import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="hp-root">
      
      {/* ── Left Side: Portal Entry ───────────────────────────────────── */}
      <main className="hp-portal-panel">
        <div className="hp-portal-container">
          
          <div className="hp-portal-header">
            <h2 className="hp-h2">Portal Access</h2>
            <p className="hp-sub">Access the Prototypes by selecting the appropriate button below</p>
          </div>

          <div className="hp-actions">
            <button 
              className="hp-btn hp-btn--active"
              onClick={() => navigate('/admin/login')}
            >
              Recruiter Portal
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>

            <button 
              className="hp-btn"
              onClick={() => navigate('/candidate/login')}
            >
              Candidate Portal
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>

          <footer className="hp-footer-note">
            <span>PLATFORM.CORE.V1.0</span>
            <span>© 2026 SKILLSYNC</span>
          </footer>

        </div>
      </main>

      {/* ── Right Side: Engineering Specifications ────────────────────── */}
      <aside className="hp-brand-panel">
        <div className="hp-logo">
          SKILL <span>SYNC</span>
        </div>

        <h1 className="hp-h1">
          Unified Recruitment<br />
          Platform
        </h1>

        <div className="hp-details">
          <div className="hp-detail-section">
            <span className="hp-detail-label">01 // CV Intelligence Engine</span>
            <ul className="hp-detail-list">
              <li>Candidate Profiling & Ranking</li>
              <li>Career Pathing for Target Roles</li>
              <li>Certification Diagnostics & Links</li>
            </ul>
          </div>

          <div className="hp-detail-section">
            <span className="hp-detail-label">02 // Recruitment Lifecycle</span>
            <ul className="hp-detail-list">
              <li>End-to-End Application Tracking</li>
              <li>Candidate Evaluation Pipeline</li>
            </ul>
          </div>
        </div>
      </aside>

    </div>
  )
}
