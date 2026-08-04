import { useState } from 'react'
import Sidebar  from './components/Sidebar'
import Header   from './components/Header'
import Overview from './pages/Overview'
import Insights from './pages/Insights'
import { useData } from './hooks/useData'

const SIDEBAR_OPEN = 200
const SIDEBAR_COLLAPSED = 56

export default function App() {
  const [page,      setPage]      = useState('overview')
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sarmaan_sidebar') === 'true'
  )
  const { raw, fetchedAt, loading, error, refresh } = useData()

  const sw = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_OPEN

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        page={page}
        onNavigate={setPage}
        collapsed={collapsed}
        onToggle={() => {
          const next = !collapsed
          setCollapsed(next)
          localStorage.setItem('sarmaan_sidebar', String(next))
        }}
      />

      {/* Main: takes remaining width, never overflows */}
      <div style={{
        marginLeft: sw,
        width: `calc(100vw - ${sw}px)`,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.3s ease, width 0.3s ease',
        overflowX: 'hidden',
      }}>
        <Header
          page={page}
          fetchedAt={fetchedAt}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />

        {error && (
          <div style={{ margin: '16px 20px 0' }} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            Could not load data.json: {error}. Make sure <code>data.json</code> is in the <code>public/</code> folder.
          </div>
        )}

        {loading && !raw.length && (
          <div className="p-5">
            <div className="grid grid-cols-7 gap-3 mb-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-surface-border animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64 rounded-xl bg-surface-border animate-pulse" />
              <div className="h-64 rounded-xl bg-surface-border animate-pulse" />
            </div>
          </div>
        )}

        {raw.length > 0 && (
          page === 'overview'
            ? <Overview raw={raw} />
            : <Insights raw={raw} />
        )}
      </div>
    </div>
  )
}
