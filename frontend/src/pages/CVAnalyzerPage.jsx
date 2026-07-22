import { useState, useEffect } from 'react'
import TopNav from '../components/TopNav'

export default function CVAnalyzerPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [jobTitle, setJobTitle] = useState("Senior Logistics Manager")
  const [error, setError] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedFixes, setCompletedFixes] = useState([])
  const [availableJobs, setAvailableJobs] = useState([])
  const [applying, setApplying] = useState(false)
  const [file, setFile] = useState(null)
  const [targetCountries, setTargetCountries] = useState("")
  const [relocateAnywhere, setRelocateAnywhere] = useState(false)

  useEffect(() => {
    // Load jobs so they can apply after analysis
    fetch('/api/candidate/jobs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('candidate_token')}` }
    })
    .then(r => r.json())
    .then(data => setAvailableJobs(data.items || []))
    .catch(console.error)
  }, [])

  const ANALYSIS_STEPS = [
    "Initializing Neural Engine...",
    "Extracting Semantic Content...",
    "Comparing against Target JD...",
    "Auditing Skills & Experience...",
    "Identifying Strategic Red Flags...",
    "Finalizing Performance Report..."
  ]

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) setFile(selectedFile)
  }

  const handleFileUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setCurrentStep(0)

    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev))
    }, 1200)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('job_title', jobTitle)
    formData.append('target_countries', targetCountries)
    formData.append('relocate_anywhere', relocateAnywhere)

    try {
      const response = await fetch('/api/cv/analyze', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error("Analysis failed. Make sure the backend is running.")
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      clearInterval(stepInterval)
    }
  }

  const toggleFix = (index) => {
    setCompletedFixes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  const handleApply = async () => {
    // Find a matching job or just pick the first one for this demo
    const job = availableJobs.find(j => j.job_details.job_title.toLowerCase().includes(jobTitle.toLowerCase())) || availableJobs[0]
    if (!job) {
      alert("No active jobs found matching this title.")
      return
    }

    setApplying(true)
    try {
      const res = await fetch('/api/candidate/applications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('candidate_token')}`
        },
        body: JSON.stringify({ job_post_id: job.id })
      })
      if (!res.ok) throw new Error(await res.text())
      alert(`Successfully applied for ${job.job_details.job_title}!`)
    } catch (e) {
      alert(`Application failed: ${e.message}`)
    } finally {
      setApplying(false)
    }
  }

  const exportPDF = () => {
    window.print()
  }

  return (
    <div className="app-shell">
      <TopNav />
      <div className="hero-banner"></div>

      <div className="page-wrapper">
        <div className="flex justify-between items-center mb-6" style={{ color: 'white' }}>
          <h1 style={{ color: 'white', fontSize: '28px' }}>CV Analyzer</h1>
        </div>

        <div className="card mb-6" style={{ background: 'var(--surface)', padding: '32px', textAlign: 'center' }}>
          {!results && !loading && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text)' }}>Upload Resume for Analysis</h2>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <label className="form-label">Target Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="form-input"
                  placeholder="Enter Target Job Title..."
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <label className="form-label">Target Countries (comma separated)</label>
                <input
                  type="text"
                  value={targetCountries}
                  onChange={(e) => setTargetCountries(e.target.value)}
                  className="form-input"
                  placeholder="e.g. UAE, UK, Singapore"
                  disabled={relocateAnywhere}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)' }}>
                   <input type="checkbox" checked={relocateAnywhere} onChange={e => setRelocateAnywhere(e.target.checked)} />
                   Anywhere (Ready to Relocate)
                </label>
              </div>

              {error && <div style={{ color: 'var(--error)', marginBottom: '16px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>{error}</div>}

              <div
                style={{
                  border: file ? '1px solid var(--success)' : '2px dashed var(--primary)',
                  padding: '30px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: file ? 'rgba(34, 197, 94, 0.02)' : 'rgba(16, 157, 184, 0.05)',
                  transition: 'all var(--transition)',
                  textAlign: 'center',
                  marginBottom: '24px'
                }}
                onClick={!file ? () => document.getElementById('fileInput').click() : undefined}
              >
                <input type="file" id="fileInput" hidden accept=".pdf,.docx" onChange={handleFileChange} />
                
                {!file ? (
                  <>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📤</div>
                    <h3 style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '16px' }}>Click to Upload Resume (PDF, DOCX)</h3>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: 'var(--success)', fontWeight: '600', fontSize: '15px' }}>
                      Selected: {file.name}
                    </div>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ fontSize: '13px', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Change file
                    </div>
                  </div>
                )}
              </div>

              {file && (
                <div style={{ padding: '20px', background: 'rgba(16, 157, 184, 0.1)', borderRadius: '12px', border: '1px solid var(--primary)', marginBottom: '24px' }}>
                   <p style={{ color: 'var(--text)', marginBottom: '12px', fontWeight: 500 }}>Ready to analyze your resume for {jobTitle}?</p>
                   <button 
                    onClick={handleFileUpload} 
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', height: '60px', fontSize: '20px', letterSpacing: '0.5px' }}
                  >
                    Analyze Resume
                  </button>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div style={{ padding: '60px 0' }}>
              <div className="spinner" style={{ borderTopColor: 'var(--primary)', width: '60px', height: '60px', borderWidth: '5px' }}></div>
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ color: 'var(--text)', fontSize: '20px', marginBottom: '8px' }}>{ANALYSIS_STEPS[currentStep]}</h3>
                <div style={{ width: '300px', height: '6px', background: 'var(--border)', margin: '0 auto', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${((currentStep + 1) / ANALYSIS_STEPS.length) * 100}%`, 
                    height: '100%', 
                    background: 'var(--primary)', 
                    transition: 'width 0.8s ease' 
                  }}></div>
                </div>
                <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>This usually takes 5-10 seconds...</p>
              </div>
            </div>
          )}
        </div>

        {results && (
          <div className="printable-report">
            <style>{`
              @media print {
                .app-shell > *:not(.page-wrapper), 
                .hero-banner, 
                .btn-ghost, 
                .action-buttons,
                .top-nav { display: none !important; }
                .page-wrapper { padding: 0 !important; margin: 0 !important; }
                .card { border: 1px solid #eee !important; box-shadow: none !important; break-inside: avoid; }
                body { background: white !important; }
                .printable-report { padding: 20px; }
              }
            `}</style>

            <div className="flex justify-between items-center mb-6 action-buttons">
              <button onClick={() => setResults(null)} className="btn btn-ghost">← Upload Another</button>
              <div className="flex gap-3">
                <button onClick={exportPDF} className="btn btn-secondary">
                  <span>📥</span> Export Report (PDF)
                </button>
                {results.overall_ats_score >= 70 && (
                  <button 
                    onClick={handleApply} 
                    className="btn btn-primary" 
                    disabled={applying}
                    style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    {applying ? 'Applying...' : 'Apply for this Position'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }} className="gap-6">
              {/* Profile Card */}
              <div className="card">
                <div className="section-hd">
                  <h3>Candidate Profile</h3>
                  <h2>{results.candidate_metadata?.name || 'Unknown'}</h2>
                </div>
                <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {results.candidate_metadata?.email}</div>
                <div><strong>Current Role:</strong> {results.candidate_metadata?.current_title}</div>
                <div style={{ marginTop: '8px' }}><strong>Experience:</strong> {results.candidate_metadata?.total_years_exp} years ({results.candidate_metadata?.relevant_years_exp} relevant)</div>
                <div><strong>Country:</strong> {results.candidate_metadata?.detected_country}</div>
              </div>

              {/* Score Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white' }}>
                <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.9 }}>Overall ATS Score</div>
                <div style={{ fontSize: '64px', fontWeight: 'bold', lineHeight: 1 }}>{results.overall_ats_score}<span style={{ fontSize: '24px', opacity: 0.7 }}>/100</span></div>
              </div>
            </div>

            <div className="card mt-6">
              <div className="section-hd" style={{ marginBottom: 0 }}>
                <h3>Professional Summary & Fit</h3>
                <h2 style={{ fontSize: '16px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '8px', fontWeight: 'normal' }}>"{results.suggested_summary}"</h2>
                {results.candidate_metadata?.target_region_fit && (
                  <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--primary)' }}><strong>Region Fit:</strong> {results.candidate_metadata.target_region_fit}</p>
                )}
              </div>
            </div>

            {/* Sectional Report */}
            {results.sectional_report && (
              <div className="mt-6">
                <h3 className="mb-4" style={{ color: 'var(--text)', fontSize: '20px' }}>Detailed Sectional Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  
                  {/* Keyword Analysis */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <h4 style={{ color: 'var(--primary)', margin: 0 }}>Keyword Similarity</h4>
                      <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{results.sectional_report.keyword_analysis?.score}/100</div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}><strong>Feedback:</strong> {results.sectional_report.keyword_analysis?.feedback}</p>
                    {results.sectional_report.keyword_analysis?.actionable_fix && (
                      <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 157, 184, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '2px' }}>Actionable Fix</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{results.sectional_report.keyword_analysis.actionable_fix}</div>
                      </div>
                    )}
                  </div>

                  {/* Skills Audit */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <h4 style={{ color: 'var(--primary)', margin: 0 }}>Skills Match</h4>
                      <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{results.sectional_report.skills_audit?.score}/100</div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}><strong>Feedback:</strong> {results.sectional_report.skills_audit?.feedback}</p>
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--error)' }}><strong>Missing:</strong> {results.sectional_report.skills_audit?.missing_skills?.join(', ')}</span>
                    </div>
                    {results.sectional_report.skills_audit?.priority_skill_to_add && (
                      <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--success)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--success)', marginBottom: '2px' }}>Priority Skill to Add</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{results.sectional_report.skills_audit.priority_skill_to_add}</div>
                      </div>
                    )}
                  </div>

                  {/* Experience Logic */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <h4 style={{ color: 'var(--primary)', margin: 0 }}>Experience Relevance</h4>
                      <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{results.sectional_report.experience_logic?.score}/100</div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}><strong>Analysis:</strong> {results.sectional_report.experience_logic?.relevance_summary}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}><strong>Feedback:</strong> {results.sectional_report.experience_logic?.feedback}</p>
                    {results.sectional_report.experience_logic?.quantification_hack && (
                      <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 157, 184, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '2px' }}>Quantification Hack</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{results.sectional_report.experience_logic.quantification_hack}</div>
                      </div>
                    )}
                  </div>

                  {/* Formatting & Structure */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                      <h4 style={{ color: 'var(--primary)', margin: 0 }}>Formatting & Structure</h4>
                      <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{results.sectional_report.formatting_structure?.score}/100</div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}><strong>Pattern:</strong> {results.sectional_report.formatting_structure?.pattern_detected}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}><strong>Advice:</strong> {results.sectional_report.formatting_structure?.structural_advice}</p>
                    {results.sectional_report.formatting_structure?.layout_optimization && (
                      <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 157, 184, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '2px' }}>Layout Optimization</div>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{results.sectional_report.formatting_structure.layout_optimization}</div>
                      </div>
                    )}
                  </div>

                  {/* Achievements & Impact */}
                  {results.sectional_report.achievements_impact && (
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--primary)', margin: 0 }}>Achievements & Impact</h4>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{results.sectional_report.achievements_impact.score}/100</div>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{results.sectional_report.achievements_impact.feedback}</p>
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {results.sectional_report.achievements_impact.detected_achievements?.map((ach, i) => (
                          <span key={i} style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>#{ach}</span>
                        ))}
                      </div>
                      {results.sectional_report.achievements_impact.impact_multiplier_advice && (
                        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--success)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--success)', marginBottom: '2px' }}>Impact Multiplier Advice</div>
                          <div style={{ fontSize: '12px', color: 'var(--text)' }}>{results.sectional_report.achievements_impact.impact_multiplier_advice}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Market Benchmarking */}
                  {results.market_benchmarking && (
                    <div className="card" style={{ border: '2px solid var(--primary)', background: '#f8fafc' }}>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '18px' }}>Market Competitiveness</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Percentile</div>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>Top {100 - results.market_benchmarking.percentile}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Market Demand</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: results.market_benchmarking.market_demand?.toLowerCase().includes('high') ? 'var(--success)' : 'var(--text)' }}>
                            {results.market_benchmarking.market_demand}
                          </div>
                        </div>
                        <div style={{ gridColumn: 'span 2', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            Est. Salary Range ({results.market_benchmarking?.target_market_used || results.candidate_metadata?.detected_country || 'Target Region'})
                          </div>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>{results.market_benchmarking.salary_estimate}</div>
                          {results.sectional_report.market_benchmarking?.regional_positioning_strategy && (
                            <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 157, 184, 0.05)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '2px' }}>Regional Strategy</div>
                              <div style={{ fontSize: '12px', color: 'var(--text)' }}>{results.sectional_report.market_benchmarking.regional_positioning_strategy}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }} className="mt-6 gap-6">
              {/* Red Flags */}
              <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
                <div className="section-hd">
                  <h3 style={{ color: 'var(--error)' }}>Red Flags</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.red_flags?.map((flag, i) => (
                    <div key={i} style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <strong style={{ color: '#991b1b', display: 'block', fontSize: '13px', marginBottom: '2px' }}>
                        {flag.type || flag.title || 'Red Flag'}
                      </strong>
                      <span style={{ color: '#b91c1c', fontSize: '13px' }}>
                        {flag.description || flag.feedback || 'Warning detected in resume structure or content.'}
                      </span>
                    </div>
                  ))}
                  {(!results.red_flags || results.red_flags.length === 0) && <p className="text-muted">No red flags found. Great job!</p>}
                </div>
              </div>

              {/* General Career Improvements */}
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div className="section-hd">
                  <h3 style={{ color: 'var(--primary)' }}>General Career Improvements</h3>
                  <p className="text-muted text-sm">Strategic advice to elevate your long-term career trajectory.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.general_career_improvements?.map((item, i) => {
                    const isDone = completedFixes.includes(i)
                    return (
                      <div 
                        key={i} 
                        onClick={() => toggleFix(i)}
                        style={{ 
                          padding: '12px', 
                          background: isDone ? '#f0fdf4' : '#ecfdf5', 
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: `1px solid ${isDone ? '#bbf7d0' : '#e0f2fe'}`,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          gap: '12px',
                          opacity: isDone ? 0.7 : 1
                        }}
                      >
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '4px', 
                          border: `2px solid ${isDone ? 'var(--success)' : 'var(--border)'}`,
                          background: isDone ? 'var(--success)' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isDone && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: isDone ? '#166534' : 'var(--primary)', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase', textDecoration: isDone ? 'line-through' : 'none' }}>
                            {item.category}
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{item.insight}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>Next Step:</span> {item.action_step}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(!results.general_career_improvements || results.general_career_improvements.length === 0) && <p className="text-muted">No major improvements identified.</p>}
                </div>
              </div>
            </div>

            {/* Courses */}
            <div className="card mt-6">
              <div className="section-hd" style={{ marginBottom: '16px' }}>
                <h3>Suggested Upskilling</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {results.suggested_courses?.map((course, i) => (
                  course.url ? (
                    <a key={i} href={course.url} target="_blank" rel="noreferrer" className="chip active" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                      {course.name || course} ↗
                    </a>
                  ) : (
                    <div key={i} className="chip active">{course.name || course}</div>
                  )
                ))}
              </div>
            </div>

            {/* Interview Prep Section */}
            {results.interview_prep && (
              <div className="mt-6">
                 <h3 className="mb-4" style={{ color: 'var(--text)', fontSize: '20px' }}>AI Interview Preparation</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    {results.interview_prep.map((item, i) => (
                      <div key={i} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text)', marginBottom: '12px' }}>Q: {item.question}</div>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Interview Intent</div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>{item.intent}</div>
                        </div>
                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                           <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>Suggested Strategy:</span> {item.suggested_answer}
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
