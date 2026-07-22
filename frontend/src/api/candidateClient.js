const API_BASE = ''

function getToken() { return localStorage.getItem('candidate_token') }

async function request(method, path, body = null) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const config = { method, headers }

  if (body !== null) {
    headers['Content-Type'] = 'application/json'
    config.body = JSON.stringify(body)
  }

  const res = await fetch(API_BASE + path, config)

  if (res.status === 401) {
    localStorage.removeItem('candidate_token')
    localStorage.removeItem('candidate_user')
    window.dispatchEvent(new CustomEvent('candidate:logout'))
    throw new Error('Session expired. Please log in again.')
  }

  const data = await res.json().catch(() => ({ detail: 'Unknown error' }))
  if (!res.ok) throw new Error(data.detail || `Request failed: ${res.status}`)
  return data
}

export const cApi = {
  requestOtp: (email, phone) => request('POST', '/api/candidate/auth/request-otp', { email, phone }),
  register: (email, otp, password, display_name) => request('POST', '/api/candidate/auth/register', { email, otp, password, display_name }),
  login: (email, password) => request('POST', '/api/candidate/auth/login', { email, password }),
  googleAuth: (token) => request('POST', '/api/candidate/auth/google', { token }),
  listJobs: () => request('GET', '/api/candidate/jobs'),
  getApplications: () => request('GET', '/api/candidate/applications'),
  applyForJob: (job_post_id) => request('POST', '/api/candidate/applications', { job_post_id }),
  getAssessment: (attemptId) => request('GET', `/api/candidate/assessments/${attemptId}`),
  verifyProctorCode: (attemptId, code) => request('POST', `/api/candidate/assessments/${attemptId}/verify-code`, { code }),
  submitAssessment: (attemptId, payload) => request('POST', `/api/candidate/assessments/${attemptId}/submit`, payload)
}
