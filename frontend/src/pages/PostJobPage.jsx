import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api/client'

// ── Tag Input (HP Style) ──────────────────────────────────────────────────
function HPTagInput({ value = [], onChange, suggestions = [], placeholder }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  const add = (val) => {
    const v = val.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
    setOpen(false)
  }

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  ).slice(0, 8)

  return (
    <div style={{ position: 'relative' }}>
      <div className="hp-tag-wrap">
        {value.map((t, i) => (
          <span key={i} className="hp-tag">
            {t} <span className="hp-tag-del" onClick={() => remove(i)}>×</span>
          </span>
        ))}
        <input
          className="hp-tag-input"
          value={input}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input) }
            if (e.key === 'Backspace' && !input && value.length) remove(value.length - 1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
          marginTop: 4, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        }}>
          {filtered.map((s, i) => (
            <div key={i}
              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: '#1e293b' }}
              onMouseDown={() => add(s)}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const STEPS = ['Employer & Job', 'Salary & Candidate', 'Skills & Experience']

const EMPTY = {
  status: 'draft',
  employer_details: { type_of_company: '', company_name: '', publish_this_job: false, expiry_date: null },
  job_details: {
    job_title: '', job_type: '', job_location_type: '', industry: '', sub_industry: '',
    functional_area: '', designation: '', roles_and_responsibilities: '', desired_candidate_profile: '',
    keywords: [], number_of_vacancies: 1, country: '', state: '', city: '',
  },
  salary_details: { currency: 'AED', minimum_salary: '', maximum_salary: '', hide_salary_from_job_seekers: false, other_benefits: '' },
  candidate_profile: {
    gender: '', nationality: '', preferred_countries: [], preferred_states: [], preferred_cities: [],
    languages_known: [], driving_license: '', availability: '', visa_status: '',
    age_range: { min: '', max: '' },
  },
  experience_requirement: {
    work_experience_years: { min: '', max: '' },
    gcc_experience_years: { min: '', max: '' },
  },
  education_requirements: [],
  skills_requirement: { functional_skills: [], professional_skills: [], it_skills: [] },
  custom_questions: [],
  recruiter_instructions: '',
  application_mode: '',
  assessment_config: {
    assessment_name: '', screening_fields: [], knowledge_sources: [], goals: [],
    difficulty: 'Intermediate', competencies: [], delivery_rules: [], question_plan: [],
  },
}

export default function PostJobPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY)
  const [ref, setRef] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    api.referenceData().then(d => setRef(d.reference_data)).catch(console.error)
  }, [])

  const set = (path, val) => {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = val
      return next
    })
  }

  const F = (path) => {
    const keys = path.split('.')
    let v = form
    for (const k of keys) v = v?.[k]
    return v ?? ''
  }

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      const payload = JSON.parse(JSON.stringify(form)) // Deep copy to safely mutate
      
      // Robust numeric converter: empty/invalid strings -> null, valid -> Number
      const toNum = (obj, key) => {
        if (!obj) return
        const val = obj[key]
        if (val === '' || val === null || val === undefined) {
          obj[key] = null
        } else {
          const n = Number(val)
          obj[key] = isNaN(n) ? null : n
        }
      }

      toNum(payload.salary_details, 'minimum_salary')
      toNum(payload.salary_details, 'maximum_salary')
      toNum(payload.candidate_profile.age_range, 'min')
      toNum(payload.candidate_profile.age_range, 'max')
      toNum(payload.experience_requirement.work_experience_years, 'min')
      toNum(payload.experience_requirement.work_experience_years, 'max')
      toNum(payload.experience_requirement.gcc_experience_years, 'min')
      toNum(payload.experience_requirement.gcc_experience_years, 'max')
      toNum(payload.job_details, 'number_of_vacancies')

      fd.append('payload', JSON.stringify(payload))
      await api.createJob(fd)
      nav('/dashboard')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  // ── Render Helpers (Direct JSX to fix focus bug) ──────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="hp-step-content">
          <div className="hp-section-module">
            <div className="hp-module-header">
              <span className="hp-module-num">01 //</span>
              <h2 className="hp-module-title">Employer Identification</h2>
            </div>
            <div className="hp-field-grid">
              <div className="hp-form-group">
                <label className="hp-label">Company Type</label>
                <select className="hp-select" value={F('employer_details.type_of_company')} onChange={e => set('employer_details.type_of_company', e.target.value)}>
                  <option value="">Select type</option>
                  {ref?.company_types?.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Legal Entity Name</label>
                <input className="hp-input" value={F('employer_details.company_name')} onChange={e => set('employer_details.company_name', e.target.value)} placeholder="e.g. TalentBridge Global" />
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Listing Expiry</label>
                <input className="hp-input" type="date" value={F('employer_details.expiry_date') || ''} onChange={e => set('employer_details.expiry_date', e.target.value || null)} />
              </div>
              <div className="hp-form-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 24 }}>
                  <input type="checkbox" style={{ width: 18, height: 18 }} checked={form.employer_details.publish_this_job} onChange={e => set('employer_details.publish_this_job', e.target.checked)} />
                  <span className="hp-label" style={{ marginBottom: 0 }}>Public Visibility</span>
                </label>
              </div>
            </div>
          </div>

          <div className="hp-section-module">
            <div className="hp-module-header">
              <span className="hp-module-num">02 //</span>
              <h2 className="hp-module-title">Position Parameters</h2>
            </div>
            <div className="hp-field-grid">
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Job Title <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="hp-input" value={F('job_details.job_title')} onChange={e => set('job_details.job_title', e.target.value)} placeholder="e.g. Senior Systems Engineer" />
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Employment Type</label>
                <select className="hp-select" value={F('job_details.job_type')} onChange={e => set('job_details.job_type', e.target.value)}>
                  <option value="">Select</option>
                  {ref?.job_types?.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Work Environment</label>
                <select className="hp-select" value={F('job_details.job_location_type')} onChange={e => set('job_details.job_location_type', e.target.value)}>
                  <option value="">Select</option>
                  {ref?.job_locations?.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Vertical / Industry</label>
                <select className="hp-select" value={F('job_details.industry')} onChange={e => set('job_details.industry', e.target.value)}>
                  <option value="">Select</option>
                  {ref?.industries?.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Functional Domain</label>
                <select className="hp-select" value={F('job_details.functional_area')} onChange={e => set('job_details.functional_area', e.target.value)}>
                  <option value="">Select</option>
                  {ref?.functional_areas?.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Technical Objectives & Responsibilities</label>
                <textarea className="hp-textarea" value={F('job_details.roles_and_responsibilities')} onChange={e => set('job_details.roles_and_responsibilities', e.target.value)} placeholder="Enumerate the core technical objectives of this position..." />
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Ideal Candidate Profile</label>
                <textarea className="hp-textarea" style={{ minHeight: 80 }} value={F('job_details.desired_candidate_profile')} onChange={e => set('job_details.desired_candidate_profile', e.target.value)} placeholder="Define the technical and behavioral requirements..." />
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Primary Region (Country)</label>
                <select className="hp-select" value={F('job_details.country')} onChange={e => { set('job_details.country', e.target.value); set('job_details.state', ''); set('job_details.city', '') }}>
                  <option value="">Select</option>
                  {ref?.countries?.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">State / Province</label>
                <select className="hp-select" value={F('job_details.state')} onChange={e => { set('job_details.state', e.target.value); set('job_details.city', '') }}>
                  <option value="">Select</option>
                  {F('job_details.country') && ref?.location_hierarchy?.[F('job_details.country')]
                    ? Object.keys(ref.location_hierarchy[F('job_details.country')]).map(s => <option key={s}>{s}</option>)
                    : ref?.states?.map(s => <option key={s}>{s}</option>)
                  }
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Metropolis / City</label>
                <select className="hp-select" value={F('job_details.city')} onChange={e => set('job_details.city', e.target.value)}>
                  <option value="">Select</option>
                  {F('job_details.country') && F('job_details.state') && ref?.location_hierarchy?.[F('job_details.country')]?.[F('job_details.state')]
                    ? ref.location_hierarchy[F('job_details.country')][F('job_details.state')].map(c => <option key={c}>{c}</option>)
                    : ref?.cities?.map(c => <option key={c}>{c}</option>)
                  }
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Opening Count</label>
                <input className="hp-input" type="number" min={1} value={F('job_details.number_of_vacancies')} onChange={e => set('job_details.number_of_vacancies', Number(e.target.value))} />
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Strategic Keywords (ATS Tags)</label>
                <HPTagInput value={form.job_details.keywords} onChange={v => set('job_details.keywords', v)} placeholder="Add technical tags..." />
              </div>
            </div>
          </div>
        </div>
      )
      case 1: return (
        <div className="hp-step-content">
          <div className="hp-section-module">
            <div className="hp-module-header">
              <span className="hp-module-num">03 //</span>
              <h2 className="hp-module-title">Compensation Framework</h2>
            </div>
            <div className="hp-field-grid">
              <div className="hp-form-group">
                <label className="hp-label">Currency Code</label>
                <select className="hp-select" value={F('salary_details.currency')} onChange={e => set('salary_details.currency', e.target.value)}>
                  {ref?.currencies?.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="hp-label">Min Threshold</label>
                    <input className="hp-input" type="number" value={F('salary_details.minimum_salary')} onChange={e => set('salary_details.minimum_salary', e.target.value)} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="hp-label">Max Threshold</label>
                    <input className="hp-input" type="number" value={F('salary_details.maximum_salary')} onChange={e => set('salary_details.maximum_salary', e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Ancillary Benefits</label>
                <input className="hp-input" value={F('salary_details.other_benefits')} onChange={e => set('salary_details.other_benefits', e.target.value)} placeholder="Health, Equity, Relocation..." />
              </div>
              <div className="hp-form-group hp-field-full">
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 18, height: 18 }} checked={form.salary_details.hide_salary_from_job_seekers} onChange={e => set('salary_details.hide_salary_from_job_seekers', e.target.checked)} />
                  <span className="hp-label" style={{ marginBottom: 0 }}>Encapsulate compensation from public view</span>
                </label>
              </div>
            </div>
          </div>

          <div className="hp-section-module">
            <div className="hp-module-header">
              <span className="hp-module-num">04 //</span>
              <h2 className="hp-module-title">Demographic Requirements</h2>
            </div>
            <div className="hp-field-grid">
              <div className="hp-form-group">
                <label className="hp-label">Gender Specification</label>
                <select className="hp-select" value={F('candidate_profile.gender')} onChange={e => set('candidate_profile.gender', e.target.value)}>
                  <option value="">Agnostic</option>
                  {['Male', 'Female', 'Any'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Nationality</label>
                <select className="hp-select" value={F('candidate_profile.nationality')} onChange={e => set('candidate_profile.nationality', e.target.value)}>
                  <option value="">Agnostic</option>
                  {ref?.nationalities?.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Visa Classification</label>
                <select className="hp-select" value={F('candidate_profile.visa_status')} onChange={e => set('candidate_profile.visa_status', e.target.value)}>
                  <option value="">Any</option>
                  {ref?.visa_statuses?.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="hp-form-group">
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="hp-label">Age Min</label>
                    <input className="hp-input" type="number" value={F('candidate_profile.age_range.min')} onChange={e => set('candidate_profile.age_range.min', e.target.value)} placeholder="18" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="hp-label">Age Max</label>
                    <input className="hp-input" type="number" value={F('candidate_profile.age_range.max')} onChange={e => set('candidate_profile.age_range.max', e.target.value)} placeholder="60" />
                  </div>
                </div>
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Linguistic Proficiencies</label>
                <HPTagInput value={form.candidate_profile.languages_known} onChange={v => set('candidate_profile.languages_known', v)} suggestions={ref?.languages || []} placeholder="Add languages..." />
              </div>
            </div>
          </div>
        </div>
      )
      case 2: return (
        <div className="hp-step-content">
          <div className="hp-section-module">
            <div className="hp-module-header">
              <span className="hp-module-num">05 //</span>
              <h2 className="hp-module-title">Skill Matrix</h2>
            </div>
            <div className="hp-field-grid">
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Functional Competencies</label>
                <HPTagInput value={form.skills_requirement.functional_skills} onChange={v => set('skills_requirement.functional_skills', v)} suggestions={ref?.functional_skills || []} placeholder="Add skills..." />
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">Professional Core Skills</label>
                <HPTagInput value={form.skills_requirement.professional_skills} onChange={v => set('skills_requirement.professional_skills', v)} suggestions={ref?.professional_skills || []} placeholder="Add skills..." />
              </div>
              <div className="hp-form-group hp-field-full">
                <label className="hp-label">IT / Tool Stack</label>
                <HPTagInput value={form.skills_requirement.it_skills} onChange={v => set('skills_requirement.it_skills', v)} suggestions={ref?.it_skills || []} placeholder="Add technology..." />
              </div>
            </div>
          </div>

          <div className="hp-section-module">
            <div className="hp-module-header">
              <span className="hp-module-num">06 //</span>
              <h2 className="hp-module-title">Experience Vector</h2>
            </div>
            <div className="hp-field-grid">
              <div className="hp-form-group">
                <label className="hp-label">Global Experience (Years)</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input className="hp-input" type="number" min={0} value={F('experience_requirement.work_experience_years.min')} onChange={e => set('experience_requirement.work_experience_years.min', e.target.value)} placeholder="Min" />
                  <input className="hp-input" type="number" min={0} value={F('experience_requirement.work_experience_years.max')} onChange={e => set('experience_requirement.work_experience_years.max', e.target.value)} placeholder="Max" />
                </div>
              </div>
              <div className="hp-form-group">
                <label className="hp-label">Regional (GCC) Experience (Years)</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input className="hp-input" type="number" min={0} value={F('experience_requirement.gcc_experience_years.min')} onChange={e => set('experience_requirement.gcc_experience_years.min', e.target.value)} placeholder="Min" />
                  <input className="hp-input" type="number" min={0} value={F('experience_requirement.gcc_experience_years.max')} onChange={e => set('experience_requirement.gcc_experience_years.max', e.target.value)} placeholder="Max" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
      default: return null
    }
  }

  return (
    <Layout title="Post Strategic Position">
      <div className="hp-form-container">
        {/* Technical Stepper */}
        <div className="hp-stepper-wrap">
          {STEPS.map((s, i) => (
            <div key={i} className={`hp-step-item ${i === step ? 'active' : i < step ? 'done' : ''}`} onClick={() => i < step && setStep(i)}>
              <div className="hp-step-dot">{i + 1}</div>
              <span className="hp-step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="hp-form-body">
          {renderStep()}
        </div>

        {/* Navigation Actions */}
        <div className="hp-wizard-actions">
          <button className="hp-btn-prev" onClick={() => step > 0 ? setStep(s => s - 1) : nav('/dashboard')} disabled={saving}>
            {step === 0 ? '← TERMINATE' : '← PREVIOUS MODULE'}
          </button>
          
          {step < STEPS.length - 1 ? (
            <button className="hp-btn-next" onClick={() => {
              if (step === 0 && !form.job_details.job_title.trim()) { setError('CRITICAL: Position Title required.'); return }
              setError(''); setStep(s => s + 1)
            }}>
              NEXT PARAMETER →
            </button>
          ) : (
            <button className="hp-btn-next" style={{ background: '#0f172a' }} onClick={submit} disabled={saving}>
              {saving ? 'INITIALIZING DEPLOYMENT...' : 'DEPLOY POSITION //'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  )
}
