import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

const cols = [
  { key: 'lga',      label: 'LGA',           sortable: true },
  { key: 'n',        label: 'Submissions',    sortable: true, align: 'right' },
  { key: 'days',     label: 'Days active',    sortable: true, align: 'right' },
  { key: 'insidePct',label: 'Inside LGA %',  sortable: true, align: 'center' },
  { key: 'wards',    label: 'Wards',          sortable: true, align: 'right' },
  { key: 'sett',     label: 'Settlements',    sortable: true, align: 'right' },
  { key: 'hh',       label: 'Households',     sortable: true, align: 'right' },
  { key: 'dcs',      label: 'Data collectors',sortable: true, align: 'right' },
  { key: 'forms',    label: 'Forms done',     sortable: true, align: 'right' },
  { key: 'ch',       label: 'Challenges',     sortable: true, align: 'center' },
  { key: 'security', label: 'Security',       sortable: true, align: 'center' },
]

export default function LGATable({ stats }) {
  const [sort, setSort] = useState({ key: 'lga', dir: 'asc' })

  const toggleSort = (key) => {
    setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const rows = [...stats].map(s => ({
    ...s,
    days: s.days.size,
    insidePct: s.n ? Math.round(s.inside / s.n * 100) : 0,
  })).sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key]
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
    return sort.dir === 'asc' ? cmp : -cmp
  })

  // Totals
  const tot = {
    n: rows.reduce((a, r) => a + r.n, 0),
    days: new Set(stats.flatMap(s => [...s.days])).size,
    insidePct: rows.length ? Math.round(rows.reduce((a, r) => a + r.inside, 0) / rows.reduce((a, r) => a + r.n, 0) * 100) : 0,
    wards: rows.reduce((a, r) => a + r.wards, 0),
    sett: rows.reduce((a, r) => a + r.sett, 0),
    hh: rows.reduce((a, r) => a + r.hh, 0),
    dcs: rows.reduce((a, r) => a + r.dcs, 0),
    forms: rows.reduce((a, r) => a + r.forms, 0),
    ch: rows.reduce((a, r) => a + r.ch, 0),
    security: rows.reduce((a, r) => a + r.security, 0),
  }

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <span className="w-3 inline-block" />
    return sort.dir === 'asc' ? <ChevronUp size={11} className="inline" /> : <ChevronDown size={11} className="inline" />
  }

  const InsideBadge = ({ pct }) => (
    <span className={`badge text-xs ${pct >= 60 ? 'badge-green' : 'badge-red'}`}>{pct}%</span>
  )

  const IssueBadge = ({ val, color = 'warn' }) =>
    val > 0
      ? <span className={`badge badge-${color === 'warn' ? 'amber' : 'red'}`}>{val} ⚠</span>
      : <span className="text-ink-faint text-xs">—</span>

  return (
    <div className="overflow-auto max-h-[460px]">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          <tr>
            {cols.map(({ key, label, sortable, align }) => (
              <th
                key={key}
                onClick={() => sortable && toggleSort(key)}
                className={`px-3 py-2.5 text-left font-bold text-ink-muted uppercase tracking-wider text-xs border-b border-surface-border whitespace-nowrap select-none
                  ${sortable ? 'cursor-pointer hover:text-ink transition-colors' : ''}
                  ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
              >
                {label} <SortIcon k={key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.lga} className={`border-b border-surface-muted hover:bg-surface-muted transition-colors ${i % 2 === 0 ? '' : 'bg-surface-muted/30'}`}>
              <td className="px-3 py-2 font-semibold text-ink">{r.lga}</td>
              <td className="px-3 py-2 text-right font-bold text-ink">{r.n}</td>
              <td className="px-3 py-2 text-right text-ink-secondary">{r.days}</td>
              <td className="px-3 py-2 text-center"><InsideBadge pct={r.insidePct} /></td>
              <td className="px-3 py-2 text-right text-ink-secondary">{r.wards}</td>
              <td className="px-3 py-2 text-right text-ink-secondary">{r.sett}</td>
              <td className="px-3 py-2 text-right text-ink-secondary">{r.hh.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-ink-secondary">{r.dcs}</td>
              <td className="px-3 py-2 text-right text-ink-secondary">{r.forms}</td>
              <td className="px-3 py-2 text-center"><IssueBadge val={r.ch} color="warn" /></td>
              <td className="px-3 py-2 text-center"><IssueBadge val={r.security} color="red" /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-surface-border bg-brand-50">
            <td className="px-3 py-2.5 font-bold text-brand-700 text-xs uppercase tracking-wider">Total</td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.n}</td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.days}</td>
            <td className="px-3 py-2.5 text-center"><InsideBadge pct={tot.insidePct} /></td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.wards}</td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.sett}</td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.hh.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.dcs}</td>
            <td className="px-3 py-2.5 text-right font-bold text-ink">{tot.forms}</td>
            <td className="px-3 py-2.5 text-center font-bold text-ink">{tot.ch > 0 ? tot.ch : '—'}</td>
            <td className="px-3 py-2.5 text-center font-bold text-ink">{tot.security > 0 ? tot.security : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
