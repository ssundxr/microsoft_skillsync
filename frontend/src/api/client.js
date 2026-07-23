const API_BASE = ''

function getToken() { return localStorage.getItem('auth_token') }

async function request(method, path, body = null) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const config = { method, headers }

  if (body instanceof FormData) {
    config.body = body
  } else if (body !== null) {
    headers['Content-Type'] = 'application/json'
    config.body = JSON.stringify(body)
  }

  const res = await fetch(API_BASE + path, config)

  if (res.status === 401) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    window.dispatchEvent(new CustomEvent('auth:logout'))
    throw new Error('Session expired. Please log in again.')
  }

  const data = await res.json().catch(() => ({ detail: 'Unknown error' }))
  if (!res.ok) throw new Error(data.detail || `Request failed: ${res.status}`)
  return data
}

export const api = {
  login: (username, password) => request('POST', '/api/auth/login', { username, password }),
  me: () => request('GET', '/api/auth/me'),
  referenceData: () => request('GET', '/api/reference-data'),
  listJobs: () => request('GET', '/api/jobs'),
  getJob: (id) => request('GET', `/api/jobs/${id}`),
  createJob: (formData) => request('POST', '/api/jobs', formData),
  updateAssessment: (jobId, config) => request('PUT', `/api/jobs/${jobId}/assessment`, config),
  toggleJobStatus: (jobId, status) => request('PUT', `/api/jobs/${jobId}/status`, { status }),
  generateAssessment: (jobId) => request('POST', `/api/jobs/${jobId}/generate-assessment`),
  getAssessmentPayload: (jobId) => request('GET', `/api/jobs/${jobId}/assessment-payload`),
  getJobApplications: (jobId) => request('GET', `/api/jobs/${jobId}/applications`),
  getApplication: (appId) => request('GET', `/api/applications/${appId}`),
  sendAssessment: (appId) => request('POST', `/api/applications/${appId}/send-assessment`),
  getRecentProctorCodes: () => request('GET', '/api/recent-proctor-codes'),
  listCandidates: () => request('GET', '/api/candidates'),
  getPowerBiToken: () => request('GET', '/api/admin/powerbi-token'),
}

