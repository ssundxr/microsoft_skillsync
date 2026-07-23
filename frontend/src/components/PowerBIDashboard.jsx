import { useState, useEffect } from 'react'
import { PowerBIEmbed } from 'powerbi-client-react'
import { models } from 'powerbi-client'
import { api } from '../api/client'

export default function PowerBIDashboard() {
  const [reportConfig, setReportConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchToken = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getPowerBiToken()
      if (!data.embedToken || !data.embedUrl) {
        throw new Error('Embed configuration received from server is incomplete.')
      }

      setReportConfig({
        type: 'report',
        id: data.reportId,
        embedUrl: data.embedUrl,
        accessToken: data.embedToken,
        tokenType: models.TokenType.Embed,
        settings: {
          panes: {
            filters: { expanded: false, visible: true },
            pageNavigation: { visible: true, position: models.PageNavigationPosition.Bottom }
          },
          background: models.BackgroundType.Transparent,
        }
      })
    } catch (err) {
      setError(err.message || 'Failed to load PowerBI dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchToken()
  }, [])

  if (loading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
        <span className="spinner" style={{ display: 'inline-block', width: '36px', height: '36px' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-muted, #64748b)' }}>
          Securing authentication and loading PowerBI Analytics Dashboard...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '30px' }}>
        <div className="alert alert-error mb-4" style={{ padding: '16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Unable to load PowerBI Dashboard</strong>
          <span>{error}</span>
        </div>
        <button className="btn btn-primary" onClick={fetchToken}>
          Retry Loading Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '16px', borderRadius: '12px', minHeight: '650px' }}>
      {reportConfig && (
        <PowerBIEmbed
          embedConfig={reportConfig}
          cssClassName="powerbi-embedded-report"
          eventHandlers={
            new Map([
              ['loaded', () => console.log('PowerBI Report loaded successfully.')],
              ['error', (event) => console.error('PowerBI Report embed error:', event?.detail)]
            ])
          }
        />
      )}
    </div>
  )
}
