import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cApi } from '../api/candidateClient'
import TopNav from '../components/TopNav'
import { GoogleLogin } from '@react-oauth/google'

export default function CandidatePortal({ initialView }) {
  const navigate = useNavigate()
  const [view, setView] = useState(initialView) // 'login', 'register', 'dashboard'

  useEffect(() => {
    setView(initialView)
    if (initialView === 'dashboard') {
      loadDashboardData()
    }
  }, [initialView])

  // Auth State
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState(null)
  
  // Dashboard State
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const jRes = await cApi.listJobs()
      const aRes = await cApi.getApplications()
      setJobs(jRes.items || [])
      setApplications(aRes.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (view === 'login') {
        const res = await cApi.login(email, password)
        localStorage.setItem('candidate_token', res.access_token)
        localStorage.setItem('candidate_user', JSON.stringify(res.user))
        navigate('/candidate/dashboard')
      } else {
        if (!otpSent) {
          await cApi.requestOtp(email, phone)
          setOtpSent(true)
        } else {
          const res = await cApi.register(email, otp, password, displayName)
          localStorage.setItem('candidate_token', res.access_token)
          localStorage.setItem('candidate_user', JSON.stringify(res.user))
          navigate('/candidate/dashboard')
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleApply = async (jobId) => {
    try {
      await cApi.applyForJob(jobId)
      await loadDashboardData()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await cApi.googleAuth(credentialResponse.credential)
      localStorage.setItem('candidate_token', res.access_token)
      localStorage.setItem('candidate_user', JSON.stringify(res.user))
      navigate('/candidate/dashboard')
    } catch (err) {
      setError('Google Sign-In failed: ' + err.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('candidate_token')
    localStorage.removeItem('candidate_user')
    navigate('/candidate/login')
  }

  const renderAuth = () => (
    <div className="split-layout">
      {/* Left Branding Side */}
      <div className="split-left">
         <div className="branding">Skill<span>Sync</span></div>
         <div className="split-left-content">
            <h2>Candidate<br/>Experience Portal</h2>
            <p style={{ opacity: 0.9, lineHeight: 1.6, maxWidth: 300, fontSize: 16 }}>
              Apply for your dream roles and track your global placement journey.
            </p>
         </div>
      </div>

      {/* Right Login Side */}
      <div className="split-right">
        <div className="login-form-wrap">
          <h1>{view === 'login' ? 'Candidate Login' : 'Create Account'}</h1>
          <p className="sub">{view === 'login' ? 'Access your applications.' : 'Join to apply for open roles.'}</p>
          
          {error && <div className="login-error">{error}</div>}
          
          <form className="login-form mt-4" onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={otpSent && view !== 'login'} />
            </div>
            
            {view === 'register' && (
              <div className="form-group mt-2">
                <label className="form-label">Phone Number (Optional)</label>
                <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={otpSent} placeholder="+1234567890" />
              </div>
            )}

            {view === 'register' && (
              <div className="form-group mt-2">
                <label className="form-label">Full Name *</label>
                <input className="form-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required disabled={otpSent} />
              </div>
            )}

            {view === 'register' && otpSent && (
              <div className="form-group mt-2">
                <label className="form-label">Check console for OTP</label>
                <input className="form-input" type="text" value={otp} onChange={e => setOtp(e.target.value)} required placeholder="123456" />
              </div>
            )}

            {(!otpSent || view === 'login') && (
              <div className="form-group mt-2 mb-6">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            )}
            
            <button className="btn btn-primary btn-lg w-full mt-4" style={{ justifyContent: 'center' }}>
              {view === 'login' ? 'Sign In' : (otpSent ? 'Verify & Register' : 'Request OTP')}
            </button>
            
            <div className="mt-4" style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In failed')}
                useOneTap
              />
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm">
            {view === 'login' ? (
              <span>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setView('register'); setOtpSent(false); setError(null); }}>Register here</a></span>
            ) : (
              <span>Already registered? <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setOtpSent(false); setError(null); }}>Sign in</a></span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderDashboard = () => {
    const user = JSON.parse(localStorage.getItem('candidate_user') || '{}')
    
    return (
      <div className="app-shell">
        <TopNav />
        <div className="hero-banner"></div>

        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-6" style={{ color: 'white' }}>
             <h1 style={{ color: 'white', fontSize: '28px' }}>Candidate Dashboard</h1>
          </div>
          
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Your Applications</h2>

          <div className="grid gap-4 mb-6">
            {applications.length === 0 ? (
              <div className="card text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                You haven't applied to any roles yet.
              </div>
            ) : (
              applications.map(app => (
                <div key={app.id} className="card flex items-center justify-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>Application #{app.id} (Job ID: {app.job_post_id})</div>
                    <div className="text-muted text-sm mt-1">Status: <span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>{app.status.replace('_', ' ')}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 style={{ fontSize: 20, marginBottom: 16, marginTop: 40 }}>Recommended Jobs</h2>

          <div className="grid gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {jobs.map(job => {
              const applied = applications.some(a => a.job_post_id === job.id)
              return (
                <div key={job.id} className="card flex-col justify-between">
                  <div>
                    <h3 style={{ color: 'var(--text)', fontSize: 16, marginBottom: 8, textTransform: 'none' }}>{job.job_details?.job_title}</h3>
                    <p style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.job_details?.roles_and_responsibilities || 'No description provided.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-muted text-sm">{job.job_details?.job_location_type || 'Remote'}</span>
                    <button className="btn btn-sm btn-primary" onClick={() => handleApply(job.id)} disabled={applied}>
                      {applied ? 'Applied' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return view === 'login' || view === 'register' ? renderAuth() : renderDashboard()
}
