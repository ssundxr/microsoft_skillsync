import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { api } from '../api/client'

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  
  // CV Analyzer state
  const [selectedJobId, setSelectedJobId] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => {
    Promise.all([api.listCandidates(), api.listJobs()])
      .then(([candsData, jobsData]) => {
        setCandidates(candsData.items || [])
        setJobs(jobsData.items || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleAnalyze = async () => {
    if (!selectedJobId || !selectedCandidate) return
    setAnalyzing(true)
    setAnalysisResult(null)
    
    try {
      const response = await fetch(`/api/candidates/${selectedCandidate.id}/analyze-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ job_id: parseInt(selectedJobId, 10) })
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Analysis failed')
      }
      
      const data = await response.json()
      setAnalysisResult(data)
    } catch (e) {
      alert(`CV Analysis Error: ${e.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Layout title="Candidates Database">
      {error && <div className="alert alert-error mb-4">{error}</div>}
      
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          {/* Left Sidebar: List of Candidates */}
          <div className="card" style={{ padding: 0, height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>All Candidates</h3>
            </div>
            {candidates.map(cand => (
              <div 
                key={cand.id}
                onClick={() => { setSelectedCandidate(cand); setAnalysisResult(null); }}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedCandidate?.id === cand.id ? 'var(--background)' : 'transparent',
                  borderLeft: selectedCandidate?.id === cand.id ? '4px solid var(--primary)' : '4px solid transparent'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{cand.display_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{cand.email}</div>
              </div>
            ))}
            {candidates.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No candidates found.</div>
            )}
          </div>
          
          {/* Right Panel: Candidate Profile & Analyzer */}
          <div>
            {selectedCandidate ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Profile Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>{selectedCandidate.display_name}</h2>
                    <div className="text-muted">{selectedCandidate.email}</div>
                    <div className="text-muted text-sm mt-1">Joined: {new Date(selectedCandidate.created_at).toLocaleDateString()}</div>
                  </div>
                  
                  {selectedCandidate.resume_url && (
                    <a 
                      href={selectedCandidate.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>{selectedCandidate.resume_url.includes('sharepoint.com') || selectedCandidate.resume_url.includes('graph.microsoft.com') ? '📁' : '📄'}</span>
                      <span>{selectedCandidate.resume_url.includes('sharepoint.com') ? 'View on SharePoint ↗' : 'Download CV'}</span>
                    </a>
                  )}
                </div>
                
                {/* Profile Details */}
                {selectedCandidate.profile_details && Object.keys(selectedCandidate.profile_details).length > 0 && (
                  <div style={{ display: 'grid', gap: '16px', background: 'var(--background)', padding: '20px', borderRadius: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Profile Details</h3>
                    {Object.entries(selectedCandidate.profile_details).map(([key, val]) => (
                      <div key={key}>
                        <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--primary)', fontSize: '14px' }}>{key}</strong>
                        <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* CV Analyzer Widget */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🤖</span> CV Analyzer (Recruiter Mode)
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                      Select a job post to let Gemini evaluate this candidate's fit based on ground-truth matching.
                    </p>
                  </div>
                  
                  <div style={{ padding: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--muted)' }}>Target Job Post</label>
                      <select 
                        className="input" 
                        value={selectedJobId} 
                        onChange={e => setSelectedJobId(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">-- Select a Job Post --</option>
                        {jobs.map(j => (
                          <option key={j.id} value={j.id}>{j.job_details?.job_title} ({j.job_number})</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      disabled={!selectedJobId || analyzing}
                      onClick={handleAnalyze}
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Fit'}
                    </button>
                  </div>
                  
                  {/* Analysis Results */}
                  {analysisResult && (
                    <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ 
                          width: '80px', height: '80px', borderRadius: '50%', 
                          background: `conic-gradient(var(--primary) ${analysisResult.match_score_percentage}%, var(--border) 0)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: 'inset 0 0 0 8px var(--surface)'
                        }}>
                          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {analysisResult.match_score_percentage}%
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{analysisResult.recommendation}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>{analysisResult.summary}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#059669', fontSize: '14px' }}>Strengths</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                            {analysisResult.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#DC2626', fontSize: '14px' }}>Weaknesses / Gaps</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                            {analysisResult.weaknesses_or_gaps?.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                </div>
                
              </div>
            ) : (
              <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                Select a candidate from the left to view their profile.
              </div>
            )}
          </div>
          
        </div>
      )}
    </Layout>
  )
}
