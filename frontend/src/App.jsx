import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PostJobPage from './pages/PostJobPage'
import AssessmentPage from './pages/AssessmentPage'
import ApplicationsPage from './pages/ApplicationsPage'
import CandidatePortal from './pages/CandidatePortal'
import ProctoredAssessment from './pages/ProctoredAssessment'
import ReportViewPage from './pages/ReportViewPage'
import CVAnalyzerPage from './pages/CVAnalyzerPage'
import AdminCandidatesPage from './pages/AdminCandidatesPage'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('auth_token')
  if (!token) return <Navigate to="/admin/login" replace />
  return children
}

function CandidateRoute({ children }) {
  const token = localStorage.getItem('candidate_token')
  if (!token) return <Navigate to="/candidate/login" replace />
  return children
}

export default function App() {
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/admin/login'
    }
    const candHandler = () => {
      localStorage.removeItem('candidate_token')
      localStorage.removeItem('candidate_user')
      window.location.href = '/candidate/login'
    }
    window.addEventListener('auth:logout', handler)
    window.addEventListener('candidate:logout', candHandler)
    return () => {
      window.removeEventListener('auth:logout', handler)
      window.removeEventListener('candidate:logout', candHandler)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<HomePage />} />

        {/* Recruiter Routes */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/admin/candidates" element={<PrivateRoute><AdminCandidatesPage /></PrivateRoute>} />
        <Route path="/admin/post-job" element={<PrivateRoute><PostJobPage /></PrivateRoute>} />
        <Route path="/admin/assessment/:jobId" element={<PrivateRoute><AssessmentPage /></PrivateRoute>} />
        <Route path="/admin/job/:jobId/applications" element={<PrivateRoute><ApplicationsPage /></PrivateRoute>} />
        <Route path="/admin/report/:appId" element={<PrivateRoute><ReportViewPage /></PrivateRoute>} />
        
        {/* Candidate Routes */}
        <Route path="/candidate/login" element={<CandidatePortal initialView="login" />} />
        <Route path="/candidate/dashboard" element={<CandidateRoute><CandidatePortal initialView="dashboard" /></CandidateRoute>} />
        <Route path="/candidate/assessment/:attemptId" element={<CandidateRoute><ProctoredAssessment /></CandidateRoute>} />
        <Route path="/candidate/cv-analyzer" element={<CandidateRoute><CVAnalyzerPage /></CandidateRoute>} />

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
