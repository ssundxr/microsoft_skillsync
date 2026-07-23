import { useState, useEffect } from 'react'

export default function SharePointManager() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState([])
  const [folder, setFolder] = useState('CVs')
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/sharepoint/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch SharePoint status', err)
    }
  }

  const fetchFiles = async (folderName = folder) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/sharepoint/files?folder=${encodeURIComponent(folderName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setFiles(data.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch SharePoint files', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchFiles(folder)
  }, [folder])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    setActionMessage('')
    try {
      const token = localStorage.getItem('auth_token')
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('folder', folder)

      const res = await fetch('/api/sharepoint/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setActionMessage(`✅ ${data.message}`)
        setUploadFile(null)
        // Reset file input
        e.target.reset()
        fetchFiles(folder)
      } else {
        setActionMessage(`❌ ${data.detail || 'Upload failed'}`)
      }
    } catch (err) {
      setActionMessage(`❌ Upload error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (itemId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete ${fileName} from SharePoint?`)) return
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/sharepoint/files/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setActionMessage(`✅ Deleted '${fileName}' from SharePoint.`)
        fetchFiles(folder)
      } else {
        const data = await res.json()
        setActionMessage(`❌ Delete failed: ${data.detail}`)
      }
    } catch (err) {
      setActionMessage(`❌ Delete error: ${err.message}`)
    }
  }

  return (
    <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>📁</span> Microsoft SharePoint Document Storage
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Store recruiter attachments, company logos, and candidate CVs securely via Microsoft Graph API.
          </p>
        </div>

        {/* Status Badge */}
        {status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', background: status.token_acquired ? '#ecfdf5' : '#fff1f2', color: status.token_acquired ? '#047857' : '#be123c', border: `1px solid ${status.token_acquired ? '#a7f3d0' : '#fecdd3'}` }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.token_acquired ? '#10b981' : '#f43f5e' }}></span>
            {status.token_acquired ? 'SharePoint Connected' : 'Offline / Missing Creds'}
          </div>
        )}
      </div>

      {/* Info Card */}
      {status && (
        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#475569', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', border: '1px solid #e2e8f0' }}>
          <div><strong>Tenant ID:</strong> {status.tenant_id || 'Not configured'}</div>
          <div><strong>Client ID:</strong> {status.client_id || 'Not configured'}</div>
          <div><strong>Folder:</strong> {status.folder_path}</div>
          <div><strong>Graph Status:</strong> {status.message}</div>
        </div>
      )}

      {/* Action Notification */}
      {actionMessage && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', background: actionMessage.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: actionMessage.startsWith('✅') ? '#166534' : '#991b1b', border: `1px solid ${actionMessage.startsWith('✅') ? '#bbf7d0' : '#fecaca'}` }}>
          {actionMessage}
        </div>
      )}

      {/* Controls Bar: Folder Selector & Upload Form */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Select Folder:</label>
          <select 
            value={folder} 
            onChange={(e) => setFolder(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '500', background: '#ffffff', cursor: 'pointer' }}
          >
            <option value="CVs">CVs (Candidate Resumes)</option>
            <option value="RecruiterAssets">RecruiterAssets (Company Logos & Gallery)</option>
            <option value="Attachments">Attachments (Job Specs & Terms)</option>
          </select>
          <button 
            onClick={() => fetchFiles(folder)} 
            style={{ padding: '6px 12px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '13px', cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="file" 
            onChange={(e) => setUploadFile(e.target.files[0])}
            style={{ fontSize: '12px', cursor: 'pointer' }}
          />
          <button 
            type="submit" 
            disabled={uploading || !uploadFile}
            style={{ padding: '7px 16px', borderRadius: '6px', background: 'var(--primary, #2563eb)', color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: uploading || !uploadFile ? 'not-allowed' : 'pointer', opacity: uploading || !uploadFile ? 0.6 : 1 }}
          >
            {uploading ? 'Uploading...' : 'Upload to SharePoint'}
          </button>
        </form>
      </div>

      {/* Files Table */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          Loading files from SharePoint drive...
        </div>
      ) : files.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No files found in folder <code>{folder}</code></p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Upload a file above or store documents via the portal to see them here.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px' }}>Document Name</th>
                <th style={{ padding: '10px 14px' }}>Folder</th>
                <th style={{ padding: '10px 14px' }}>Size</th>
                <th style={{ padding: '10px 14px' }}>Created</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📄</span> {file.name}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', fontSize: '11px', fontWeight: '600' }}>{file.folder}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <a 
                        href={file.web_url || file.download_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ padding: '4px 10px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}
                      >
                        Preview / Open ↗
                      </a>
                      <button 
                        onClick={() => handleDelete(file.id, file.name)}
                        style={{ padding: '4px 10px', borderRadius: '4px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
