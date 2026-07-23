import Layout from '../components/Layout'
import SharePointManager from '../components/SharePointManager'

export default function SharePointPage() {
  return (
    <Layout title="SharePoint Document Storage">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <SharePointManager />
      </div>
    </Layout>
  )
}
