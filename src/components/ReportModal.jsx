import { useState } from 'react'
import { X, FileText, FileDown, Loader2 } from 'lucide-react'
import { generateWordReport, generatePDFReport } from '../utils/reportUtils'

export default function ReportModal({ raw, data, onClose }) {
  const [lga,       setLga]       = useState('all')
  const [start,     setStart]     = useState('')
  const [end,       setEnd]       = useState('')
  const [loading,   setLoading]   = useState(null) // 'word' | 'pdf'
  const [done,      setDone]      = useState(null)

  const lgas = [...new Set(raw.map(r => r.lga))].sort()

  const filteredData = data.filter(r => {
    if (start && r.date < start) return false
    if (end   && r.date > end)   return false
    return true
  })

  const download = async (type) => {
    setLoading(type)
    setDone(null)
    try {
      const opts = { lga, data: filteredData, raw, dateRange: { start, end } }
      if (type === 'word') await generateWordReport(opts)
      else await generatePDFReport({ ...opts, elementId: 'report-preview' })
      setDone(type)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-lg animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-bold text-ink">Download Report</h2>
            <p className="text-xs text-ink-muted mt-0.5">Generate a PDF or Word report for one LGA or the full state</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-muted transition-colors">
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* LGA selector */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1.5">Report scope</label>
            <select
              value={lga}
              onChange={e => setLga(e.target.value)}
              className="w-full filter-select py-2"
            >
              <option value="all">Kano State — All 44 LGAs</option>
              {lgas.map(l => <option key={l} value={l}>{l} LGA</option>)}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1.5">Date range (optional)</label>
            <div className="flex items-center gap-2">
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="filter-select flex-1 py-2" placeholder="From" />
              <span className="text-ink-muted text-xs">to</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="filter-select flex-1 py-2" placeholder="To" />
            </div>
          </div>

          {/* Info */}
          <div className="bg-brand-50 rounded-xl p-3 text-xs text-brand-700 border border-brand-200">
            <strong>What's included:</strong> State overview, top/bottom 5 LGAs, {lga !== 'all' ? `${lga} performance rank, detailed metrics,` : 'all LGA metrics,'} issues log with descriptions, and an auto-generated narrative summary.
          </div>

          {/* Preview data summary */}
          <div className="text-xs text-ink-muted">
            {filteredData.length} submission{filteredData.length !== 1 ? 's' : ''} will be included in this report
            {(start || end) && ` (${start || '…'} → ${end || '…'})`}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => download('word')}
            disabled={!!loading}
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
          >
            {loading === 'word' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Word (.docx)
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={!!loading}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            {loading === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            PDF
          </button>
        </div>

        {done && (
          <div className="px-6 pb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              ✓ {done === 'word' ? 'Word document' : 'PDF'} downloaded successfully.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
