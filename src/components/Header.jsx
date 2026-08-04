import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'

export default function Header({ page, fetchedAt, loading, error, onRefresh }) {
  const titles = {
    overview: 'LGA Coordinator Daily Report',
    insights: 'Insights - Performance & Coverage',
  }
  const subs = {
    overview: 'Kano State, Nigeria  ·  44 LGAs  ·  Kano AMR',
    insights: 'Kano State, Nigeria  ·  44 LGAs  ·  Kano AMR',
  }

  return (
    <header style={{
      background: 'linear-gradient(135deg, #155c3a 0%, #1d7a50 50%, #155c3a 100%)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div>
        <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.3, margin: 0 }}>
          {titles[page]}
        </h1>
        <p style={{ color: '#86c9a8', fontSize: 11, margin: '2px 0 0' }}>
          {subs[page]}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '4px 10px',
          fontSize: 11, color: '#c3e8d4',
        }}>
          {error ? (
            <><WifiOff size={11} style={{ color: '#fca5a5' }} /><span style={{ color: '#fca5a5' }}>Fetch failed</span></>
          ) : loading ? (
            <><RefreshCw size={11} style={{ color: '#fcd34d' }} className="animate-spin" /><span style={{ color: '#fcd34d' }}>Refreshing…</span></>
          ) : (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
              <span>Live</span>
              {fetchedAt && (
                <><span style={{ color: '#4d9e72' }}>·</span><Clock size={10} /><span>{fetchedAt}</span></>
              )}
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            color: '#fff', fontSize: 12, fontWeight: 500,
            opacity: loading ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </header>
  )
}
