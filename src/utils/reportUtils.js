import { saveAs } from 'file-saver'
import { buildLGAStats, computeKPIs, ACTIVITY_MAP } from './dataUtils'

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function cap(s) { return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '' }
function pct(a, b) { return b ? Math.round(a / b * 100) : 0 }
function avg(arr, key) { return arr.length ? arr.reduce((a, r) => a + (r[key] || 0), 0) / arr.length : 0 }
function compare(val, stateAvg) {
  if (stateAvg === 0) return 'N/A'
  const diff = Math.round((val - stateAvg) / stateAvg * 100)
  return diff >= 0 ? `+${diff}% above state avg` : `${diff}% below state avg`
}
function rankLabel(rank, total) {
  if (rank <= 5) return `Top 5 (${rank} of ${total})`
  if (rank >= total - 4) return `Bottom 5 (${rank} of ${total})`
  return `${rank} of ${total}`
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export async function generatePDFReport({ lga, data, raw, dateRange }) {
  const { default: jsPDF } = await import('jspdf')

  const lgaData    = lga === 'all' ? data : data.filter(r => r.lga === lga)
  const allStats   = buildLGAStats(raw)
  const lgaStats   = buildLGAStats(lgaData)
  const stateKPIs  = computeKPIs(data)
  const lgaStat    = lgaStats.find(s => s.lga === lga) || null
  const allSorted  = [...allStats].sort((a, b) => b.n - a.n)
  const period     = dateRange?.start ? `${dateRange.start} to ${dateRange.end}` : 'Full data collection period'

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W      = doc.internal.pageSize.getWidth()
  const H      = doc.internal.pageSize.getHeight()
  const BRAND  = [21, 92, 58]
  const DARK   = [26, 26, 24]
  const GRAY   = [100, 110, 120]
  const LGRAY  = [200, 205, 210]
  const RED    = [200, 40, 40]
  const AMBER  = [180, 100, 10]
  const GREEN  = [21, 92, 58]
  const M      = 16
  const CW     = W - M * 2
  let y        = 0

  function addFooter() {
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(`SARMAAN LC Dashboard · eHealth Africa · ${formatDate()}`, M, H - 7)
    doc.text(`${lga === 'all' ? 'Kano State Report' : lga + ' LGA Report'} · ${period}`, W - M, H - 7, { align: 'right' })
  }

  function checkY(need = 8) {
    if (y + need > H - 14) {
      addFooter()
      doc.addPage()
      y = 14
    }
  }

  function rule(color = LGRAY) {
    checkY(3)
    doc.setDrawColor(...color)
    doc.setLineWidth(0.2)
    doc.line(M, y, M + CW, y)
    y += 3
  }

  function sectionHead(title) {
    checkY(10)
    doc.setFillColor(...BRAND)
    doc.rect(M, y, CW, 7.5, 'F')
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(title, M + 3, y + 5.2)
    y += 12
  }

  function subHead(title) {
    checkY(8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND)
    doc.text(title, M, y)
    y += 5.5
  }

  function row(label, value, note = '', valueColor = DARK) {
    checkY(7)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(label, M + 2, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...valueColor)
    doc.text(String(value), M + CW * 0.52, y)
    if (note) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.text(note, M + CW * 0.72, y)
    }
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.15)
    doc.line(M, y + 1.5, M + CW, y + 1.5)
    y += 6
  }

  function para(text, color = DARK, indent = 0) {
    checkY(8)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent)
    lines.forEach(l => { checkY(5.5); doc.text(l, M + indent, y); y += 5 })
    y += 1.5
  }

  function bullet(text, color = DARK) {
    checkY(6)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - 6)
    doc.text('•', M + 2, y)
    lines.forEach((l, i) => { checkY(5); doc.text(l, M + 6, y); y += 5 })
    y += 0.5
  }

  function issueBlock(type, typeColor, date, desc, resolution) {
    checkY(16)
    const descLines = doc.splitTextToSize(desc || '', CW - 26)
    const resLines  = resolution ? doc.splitTextToSize(resolution, CW - 26) : []
    const bh = 4 + descLines.length * 4.5 + (resLines.length ? resLines.length * 4.5 + 3 : 0) + 3
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.15)
    doc.roundedRect(M, y, CW, bh, 1.5, 1.5, 'FD')
    doc.setFillColor(...typeColor)
    doc.roundedRect(M + 2, y + 2, doc.getTextWidth(type) + 4, 4.5, 1, 1, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(type, M + 4, y + 5.2)
    if (date) {
      doc.setTextColor(...GRAY)
      doc.setFont('helvetica', 'normal')
      doc.text(date, M + CW - 2, y + 5.2, { align: 'right' })
    }
    y += 8
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    descLines.forEach(l => { checkY(4.5); doc.text(l, M + 4, y); y += 4.5 })
    if (resolution) {
      doc.setTextColor(...GREEN)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      resLines.forEach(l => { checkY(4.5); doc.text(l, M + 4, y); y += 4.5 })
    }
    y += 3
  }

  // ── COVER ──
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 52, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 52, W, 2, 'F')
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('SARMAAN PROJECT', W / 2, 18, { align: 'center' })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('LGA Coordinator Field Activity Report', W / 2, 27, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(167, 243, 208)
  doc.text(lga === 'all' ? 'Kano State - All 44 LGAs' : `${lga} LGA`, W / 2, 36, { align: 'center' })
  doc.setFontSize(8.5)
  doc.setTextColor(134, 200, 168)
  doc.text(`Reporting period: ${period}`, W / 2, 44, { align: 'center' })
  doc.text(`Generated: ${formatDate()}  ·  Kano State, Nigeria  ·  Kano AMR Programme`, W / 2, 49, { align: 'center' })
  y = 60
  addFooter()

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 1 - KANO STATE SNAPSHOT
  // ──────────────────────────────────────────────────────────────────────────
  sectionHead('Section 1 - Kano State Snapshot')
  para(`This section summarises performance across all 44 LGA Coordinators in Kano State during the reporting period. It provides the broader context against which individual LGA performance is assessed.`)

  subHead('Overall Submission & Presence')
  row('Total reports submitted',         stateKPIs.total,                             `across ${new Set(data.map(r=>r.date)).size} reporting days`)
  row('Active LGAs (at least 1 submission)',      `${stateKPIs.activeLGAs} of 44`,            `${44 - stateKPIs.activeLGAs} LGAs with zero submissions`)
  row('State-wide inside LGA rate',       `${stateKPIs.insidePct}%`,                  `${stateKPIs.inside} of ${stateKPIs.total} reports from within assigned LGA`)
  row('Total wards covered',             stateKPIs.wards.toLocaleString(),             `avg ${(avg(allStats,'wards')).toFixed(1)} per LGA`)
  row('Total settlements covered',       stateKPIs.settlements.toLocaleString(),       `avg ${(avg(allStats,'sett')).toFixed(1)} per LGA`)
  row('Total households visited',        stateKPIs.hh.toLocaleString(),               `avg ${Math.round(avg(allStats,'hh'))} per LGA`)
  row('Total DC assignments',            stateKPIs.dcsPresent.toLocaleString(),        `avg ${(avg(allStats,'dcs')).toFixed(1)} per LGA`)
  row('Total forms completed',           stateKPIs.formsCompleted.toLocaleString(),   '')

  y += 2
  subHead('Issues Summary (State-wide)')
  row('Operational challenges flagged',  stateKPIs.challenges,  `${pct(stateKPIs.challenges, stateKPIs.total)}% of all submissions`)
  row('Critical issues escalated',       stateKPIs.critical,    `requiring state team attention`)
  row('Device / technical issues',       stateKPIs.device,      '')
  row('Security / access incidents',     stateKPIs.security,    '')

  y += 2
  subHead('Top 5 LGAs - Submission Count')
  allSorted.slice(0, 5).forEach((s, i) => {
    const p2 = s.n ? Math.round(s.inside / s.n * 100) : 0
    row(`${i+1}. ${s.lga}`, `${s.n} reports`, `${p2}% inside LGA · ${s.hh.toLocaleString()} HH`)
  })

  y += 2
  subHead('Bottom 5 LGAs - Submission Count')
  allSorted.slice(-5).reverse().forEach((s, i) => {
    const note = s.hh === 0 ? 'No household data recorded' : `${s.hh.toLocaleString()} HH visited`
    row(`${allSorted.length - i}. ${s.lga}`, `${s.n} reports`, note, s.n <= 5 ? RED : AMBER)
  })

  if (lga === 'all') {
    addFooter()
    doc.save(`SARMAAN_Kano_State_Report_${new Date().toISOString().slice(0,10)}.pdf`)
    return
  }

  if (!lgaStat) {
    para('No data found for the selected LGA and period.')
    addFooter()
    doc.save(`SARMAAN_${lga.replace(/\s+/g,'_')}_Report_${new Date().toISOString().slice(0,10)}.pdf`)
    return
  }

  // ── Derived metrics ──
  const lgaInPct        = pct(lgaStat.inside, lgaStat.n)
  const lgaHHRank       = [...allStats].sort((a,b)=>b.hh-a.hh).findIndex(s=>s.lga===lga)+1
  const lgaSubRank      = allSorted.findIndex(s=>s.lga===lga)+1
  const activeStats     = allStats.filter(s => s.n > 0)
  const lgaInsideRank   = [...activeStats].sort((a,b)=>pct(b.inside,b.n)-pct(a.inside,a.n)).findIndex(s=>s.lga===lga)+1
  const stateAvgHH      = avg(activeStats, 'hh')
  const stateAvgSett    = avg(activeStats, 'sett')
  const stateAvgWards   = avg(activeStats, 'wards')
  const stateAvgDCS     = avg(activeStats, 'dcs')
  const stateAvgForms   = avg(activeStats, 'forms')
  const stateAvgInPct   = pct(stateKPIs.inside, stateKPIs.total)
  const days            = [...lgaStat.days].sort()
  const totalExpected   = lgaStat.dcs + lgaStat.dcs_partial + lgaStat.dcs_absent
  const dcAttendRate    = pct(lgaStat.dcs, totalExpected)
  const formPerDC       = lgaStat.dcs > 0 ? (lgaStat.forms / lgaStat.dcs).toFixed(1) : 'N/A'
  const stateFormPerDC  = stateAvgDCS > 0 ? (stateAvgForms / stateAvgDCS).toFixed(1) : 'N/A'
  const hhPerWard       = lgaStat.wards > 0 ? Math.round(lgaStat.hh / lgaStat.wards) : 0
  const settPerWard     = lgaStat.wards > 0 ? (lgaStat.sett / lgaStat.wards).toFixed(1) : 'N/A'
  const settPerDay      = lgaStat.days.size > 0 ? (lgaStat.sett / lgaStat.days.size).toFixed(1) : '0'
  const hhPerDay        = lgaStat.days.size > 0 ? Math.round(lgaStat.hh / lgaStat.days.size) : 0

  // Gap analysis
  const allReportDates  = [...new Set(raw.map(r=>r.date))].sort()
  const submittedSet    = lgaStat.days
  const gaps = []
  for (let i = 1; i < allReportDates.length; i++) {
    const prev = allReportDates[i-1], curr = allReportDates[i]
    if (!submittedSet.has(curr) && submittedSet.has(prev)) {
      let end = curr, j = i
      while (j < allReportDates.length && !submittedSet.has(allReportDates[j])) { end = allReportDates[j]; j++ }
      gaps.push({ from: prev, to: end, days: j - i })
    }
  }
  const longestGap = gaps.length ? gaps.reduce((a,b) => b.days > a.days ? b : a) : null
  const consistencyPct = pct(lgaStat.days.size, allReportDates.length)

  // Activity breakdown
  const actKeys = Object.keys(ACTIVITY_MAP)
  const actTotals = actKeys.map(k => ({ key: k, label: ACTIVITY_MAP[k].label, count: lgaData.reduce((a,r)=>a+(r[k]||0),0) })).filter(a=>a.count>0).sort((a,b)=>b.count-a.count)

  // Outside LGA reasons
  const outsideRows = lgaData.filter(r => r.status === 'outside' && r.outside_reason)
  const outsideReasons = {}
  outsideRows.forEach(r => { outsideReasons[r.outside_reason] = (outsideReasons[r.outside_reason] || 0) + 1 })

  // Device resolution rate
  const deviceYes      = lgaStat.devices || []
  const resolved       = deviceYes.filter(d => d.resolved?.toLowerCase() === 'yes').length
  const unresolved     = deviceYes.length - resolved
  const devResRate     = deviceYes.length ? pct(resolved, deviceYes.length) : null

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 2 - LGA POSITION IN STATE
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead(`Section 2 - ${lga} LGA: Position in Kano State`)
  para(`This section shows how ${lga} ranks against all 44 LGA Coordinators across key performance metrics. Rankings use data from the full state dataset regardless of any date filters applied.`)

  row('Submission count rank',         rankLabel(lgaSubRank, allSorted.length),       `${lgaStat.n} reports vs state avg ${Math.round(avg(allStats,'n'))}`, lgaSubRank <= 10 ? GREEN : lgaSubRank >= allSorted.length - 9 ? RED : DARK)
  row('Household coverage rank',       rankLabel(lgaHHRank, allStats.length),         `${lgaStat.hh.toLocaleString()} HH vs state avg ${Math.round(stateAvgHH).toLocaleString()}`)
  row('Inside LGA presence rank',      rankLabel(lgaInsideRank, allStats.filter(s=>s.n>0).length), `${lgaInPct}% vs state avg ${stateAvgInPct}%`, lgaInPct >= stateAvgInPct ? GREEN : RED)
  row('Settlements covered',           lgaStat.sett,                                  compare(lgaStat.sett, stateAvgSett))
  row('Wards covered',                 lgaStat.wards,                                 compare(lgaStat.wards, stateAvgWards))
  row('DC assignments',                lgaStat.dcs,                                   compare(lgaStat.dcs, stateAvgDCS))

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 3 - FIELD PRESENCE ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead(`Section 3 - Field Presence Analysis`)

  row('Total reports submitted',       lgaStat.n,                    `across ${lgaStat.days.size} active days`)
  row('Reports from inside LGA',       lgaStat.inside,               `${lgaInPct}% inside rate (state avg: ${stateAvgInPct}%)`, lgaInPct >= stateAvgInPct ? GREEN : RED)
  row('Reports from outside LGA',      lgaStat.n - lgaStat.inside,   `${100 - lgaInPct}% of all submissions`)

  if (Object.keys(outsideReasons).length) {
    y += 1
    subHead('Reasons for Outside-LGA Submissions')
    Object.entries(outsideReasons).sort((a,b)=>b[1]-a[1]).forEach(([reason, count]) => {
      bullet(`${reason} - ${count} occurrence${count>1?'s':''}`)
    })
  }

  y += 1
  if (lgaInPct >= 80) {
    para(`${lga} demonstrates strong field discipline with ${lgaInPct}% of reports submitted from within the assigned LGA - ${lgaInPct - stateAvgInPct} percentage points above the state average. This indicates the coordinator is consistently operating within their area of responsibility.`, GREEN)
  } else if (lgaInPct >= 60) {
    para(`${lga} meets the minimum field presence threshold with ${lgaInPct}% inside-LGA rate, though there is room for improvement to reach the 80%+ benchmark seen in top-performing LGAs.`, AMBER)
  } else {
    para(`${lga} has a low inside-LGA rate of ${lgaInPct}%, which is ${stateAvgInPct - lgaInPct} percentage points below the state average. This warrants investigation - the coordinator may be working across LGA boundaries or there may be geofencing issues.`, RED)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 4 - COVERAGE & PRODUCTIVITY
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead('Section 4 - Coverage & Productivity')
  para(`Coverage metrics measure the geographic and numerical reach of field activities. Productivity ratios reveal how effectively resources are being used.`)

  subHead('Geographic Coverage')
  row('Wards covered (total)',          lgaStat.wards,                compare(lgaStat.wards, stateAvgWards))
  row('Settlements covered (total)',    lgaStat.sett,                 compare(lgaStat.sett, stateAvgSett))
  row('Households visited (approx.)',   lgaStat.hh.toLocaleString(),  compare(lgaStat.hh, stateAvgHH))

  y += 1
  subHead('Productivity Ratios')
  row('Households per ward',            hhPerWard > 0 ? hhPerWard : 'No ward data',      'depth of coverage per ward')
  row('Settlements per ward',           settPerWard !== 'N/A' ? settPerWard : 'No ward data', 'geographic spread within wards')
  row('Settlements per active day',     settPerDay,                   'pace of field coverage')
  row('Households per active day',      hhPerDay > 0 ? hhPerDay : 'No HH data',          'daily household reach')

  if (lgaStat.hh === 0 && lgaStat.wards === 0) {
    y += 1
    para(`⚠ No ward, settlement, or household data has been recorded for ${lga}. This is a significant data gap. The most likely cause is that the coordinator has not been selecting "Field Coordination & Implementation" as an activity type in the daily form - this selection is required to trigger coverage questions. Immediate follow-up is recommended.`, RED)
  } else if (hhPerWard < 10 && lgaStat.wards > 0) {
    y += 1
    para(`The household-to-ward ratio of ${hhPerWard} is low, suggesting coordinators may be covering wards without achieving adequate household reach within each ward. Consider whether coordinators need to increase time per ward.`, AMBER)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 5 - DATA COLLECTOR TEAM MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead('Section 5 - Data Collector Team Management')
  para(`This section assesses how effectively the coordinator is managing their data collector (DC) team, including attendance patterns and form completion.`)

  row('Total DC assignments reported',  lgaStat.dcs,                 `avg ${(lgaStat.dcs / Math.max(lgaStat.days.size,1)).toFixed(1)} DCs per active day`)
  row('DC partial attendance',          lgaStat.dcs_partial,         totalExpected > 0 ? `${pct(lgaStat.dcs_partial, totalExpected)}% of total` : '')
  row('DC absences recorded',           lgaStat.dcs_absent,          totalExpected > 0 ? `${pct(lgaStat.dcs_absent, totalExpected)}% of total` : '', lgaStat.dcs_absent > 0 ? AMBER : DARK)
  row('DC attendance rate',             totalExpected > 0 ? `${dcAttendRate}%` : 'N/A', `present / (present + partial + absent)`, dcAttendRate >= 80 ? GREEN : dcAttendRate >= 60 ? AMBER : RED)
  row('Total forms completed',          lgaStat.forms,               compare(lgaStat.forms, stateAvgForms))
  row('Forms completed per DC',         formPerDC,                   `state avg: ${stateFormPerDC}`, parseFloat(formPerDC) >= parseFloat(stateFormPerDC) ? GREEN : AMBER)

  y += 1
  if (lgaStat.dcs_absent > lgaStat.dcs * 0.2) {
    para(`DC absence rate is notably high - ${lgaStat.dcs_absent} absences recorded against ${lgaStat.dcs} present assignments. This may be affecting coverage outcomes and should be addressed with the coordinator.`, RED)
  }
  if (parseFloat(formPerDC) > 0 && parseFloat(formPerDC) < parseFloat(stateFormPerDC) * 0.7) {
    para(`Form completion per DC (${formPerDC}) is significantly below the state average (${stateFormPerDC}). This may indicate DCs are present but not completing surveys at the expected rate, or that forms are not being tracked accurately.`, AMBER)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 6 - ACTIVITY PROFILE
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead('Section 6 - Activity Profile')
  para(`Activity types logged across all submissions for ${lga}. One report can include multiple activity types. The profile reveals how the coordinator is allocating their time during the reporting period.`)

  if (actTotals.length === 0) {
    para('No activity type data recorded.', GRAY)
  } else {
    const topActivity = actTotals[0]
    actTotals.forEach(a => {
      const sharePct = pct(a.count, lgaStat.n)
      row(a.label, `${a.count} reports`, `${sharePct}% of all submissions`)
    })
    y += 1
    const fieldCount = lgaData.filter(r => r.fieldCoord === 1).length
    const fieldPct   = pct(fieldCount, lgaStat.n)
    if (fieldPct < 30 && lgaStat.hh > 0) {
      para(`Field Coordination & Implementation was selected in only ${fieldPct}% of submissions. Since household data is captured under this activity type, low selection may be causing gaps in coverage reporting for this LGA.`, AMBER)
    } else if (fieldPct >= 60) {
      para(`Field Coordination & Implementation dominates the activity profile (${fieldPct}% of submissions), which is appropriate for the field data collection phase.`, GREEN)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 7 - ISSUES DEEP DIVE
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead('Section 7 - Issues Deep Dive')

  const hasIssues = lgaStat.challenges.length || lgaStat.criticals.length || lgaStat.devices.length || lgaStat.securities.length
  if (!hasIssues) {
    para('No issues were flagged for this LGA during the selected period.', GREEN)
  }

  if (lgaStat.challenges.length) {
    subHead(`Operational Challenges (${lgaStat.challenges.length})`)
    lgaStat.challenges.forEach(c => issueBlock('CHALLENGE', AMBER, c.date, c.desc, null))
  }

  if (lgaStat.criticals.length) {
    subHead(`Critical Issues Escalated (${lgaStat.criticals.length})`)
    lgaStat.criticals.forEach(c => issueBlock('CRITICAL', RED, c.date, c.desc, null))
  }

  if (lgaStat.devices.length) {
    subHead(`Device / Technical Issues (${lgaStat.devices.length} - ${devResRate !== null ? devResRate + '% resolved' : ''})`)
    if (unresolved > 0) {
      para(`⚠ ${unresolved} device issue${unresolved > 1 ? 's remain' : ' remains'} unresolved and require follow-up action.`, RED)
    }
    lgaStat.devices.forEach(d => {
      const res = d.resolved?.toLowerCase() === 'yes'
        ? `✓ Resolved: ${d.action}`
        : d.action ? `⏳ Pending action: ${d.action}` : '⏳ No resolution recorded'
      issueBlock(`DEVICE · ${cap(d.type) || 'Issue'}`, [100, 60, 200], d.date, d.desc, res)
    })
  }

  if (lgaStat.securities.length) {
    subHead(`Security / Access Incidents (${lgaStat.securities.length})`)
    lgaStat.securities.forEach(s => {
      const text = [s.desc, s.location ? `Location: ${s.location}` : ''].filter(Boolean).join(' - ')
      issueBlock('SECURITY', [200, 80, 20], s.date, text, s.action ? `Action taken: ${s.action}` : null)
    })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 8 - CONSISTENCY & SUBMISSION GAPS
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead('Section 8 - Consistency & Submission Gaps')
  para(`This section analyses the regularity of submissions across the reporting period to identify gaps and assess coordinator engagement.`)

  row('Active reporting days',          lgaStat.days.size,                    `of ${allReportDates.length} total reporting days in dataset`)
  row('Consistency rate',               `${consistencyPct}%`,                 `submitted on ${consistencyPct}% of all reporting days`, consistencyPct >= 80 ? GREEN : consistencyPct >= 60 ? AMBER : RED)
  row('First submission date',          days[0] || 'N/A',                     '')
  row('Last submission date',           days[days.length - 1] || 'N/A',       '')
  row('Number of submission gaps',      gaps.length,                          gaps.length === 0 ? 'No gaps detected' : 'periods with no submission', gaps.length > 2 ? RED : gaps.length > 0 ? AMBER : GREEN)

  if (longestGap) {
    row('Longest gap without submission', `${longestGap.days} day${longestGap.days>1?'s':''}`, `from ${longestGap.from} to ${longestGap.to}`, longestGap.days > 3 ? RED : AMBER)
  }

  if (gaps.length > 0) {
    y += 1
    subHead('Gap Details')
    gaps.forEach(g => {
      bullet(`${g.from} → ${g.to}: ${g.days} day${g.days>1?'s':''} without submission`)
    })
  }

  y += 1
  if (consistencyPct >= 85) {
    para(`${lga} shows excellent submission consistency at ${consistencyPct}%, indicating a highly reliable coordinator who is submitting regularly throughout the data collection period.`, GREEN)
  } else if (consistencyPct >= 65) {
    para(`${lga} has moderate submission consistency (${consistencyPct}%). Some gaps exist which may be attributable to the planned breaks in the data collection schedule, but unexplained gaps should be followed up.`, AMBER)
  } else {
    para(`${lga} has low submission consistency at ${consistencyPct}%. Significant gaps in the submission record suggest the coordinator may need additional support or monitoring. Cross-reference gap dates with the programme schedule to identify unplanned absences.`, RED)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 9 - RECOMMENDATIONS
  // ──────────────────────────────────────────────────────────────────────────
  rule(BRAND)
  sectionHead('Section 9 - Recommendations')
  para(`The following recommendations are generated from the data above. They are specific to ${lga} LGA based on observed patterns and gaps.`)

  const recs = []

  if (lgaInPct < stateAvgInPct) recs.push(`Field presence: The inside-LGA rate of ${lgaInPct}% is below the state average of ${stateAvgInPct}%. Discuss with the coordinator to understand reasons for operating outside their LGA and reinforce the expectation of in-LGA presence during data collection.`)
  if (lgaStat.hh === 0) recs.push(`Coverage data gap: No household, ward, or settlement data recorded. Urgently confirm whether the coordinator is selecting "Field Coordination & Implementation" in the daily form. Provide re-training on form completion if necessary.`)
  if (lgaStat.dcs_absent > lgaStat.dcs * 0.15) recs.push(`DC attendance: ${lgaStat.dcs_absent} DC absences recorded. Follow up with the coordinator to understand the cause and ensure data collector teams are adequately mobilised for remaining collection days.`)
  if (unresolved > 0) recs.push(`Device issues: ${unresolved} device issue${unresolved > 1 ? 's are' : ' is'} unresolved. Coordinate with the technical team to address pending device problems that may be limiting data collection capacity.`)
  if (consistencyPct < 70) recs.push(`Submission consistency: At ${consistencyPct}%, the coordinator is missing a significant proportion of expected reporting days. Review gap dates with the coordinator and establish whether absences are programme-related or require corrective action.`)
  if (parseFloat(formPerDC) !== 'N/A' && parseFloat(formPerDC) < parseFloat(stateFormPerDC) * 0.7) recs.push(`Form completion: Forms per DC (${formPerDC}) is well below the state average (${stateFormPerDC}). Investigate whether DCs are completing surveys at the expected pace or whether there are workflow bottlenecks.`)
  if (lgaStat.criticals.length > 0) recs.push(`Critical escalations: ${lgaStat.criticals.length} critical issue${lgaStat.criticals.length > 1 ? 's were' : ' was'} flagged for state team attention. Confirm that each escalation has been received, logged, and actioned by the relevant state team member.`)
  if (recs.length === 0) recs.push(`${lga} is performing well across all assessed dimensions. Continue monitoring to sustain current performance levels and share practices with lower-performing LGAs.`)

  recs.forEach((rec, i) => bullet(`${i + 1}. ${rec}`))

  // ── CLOSE ──
  addFooter()
  doc.save(`SARMAAN_${lga.replace(/\s+/g,'_')}_Report_${new Date().toISOString().slice(0,10)}.pdf`)
}

// ─── WORD ─────────────────────────────────────────────────────────────────────
export async function generateWordReport({ lga, data, raw, dateRange }) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType } = await import('docx')

  const lgaData   = lga === 'all' ? data : data.filter(r => r.lga === lga)
  const allStats  = buildLGAStats(raw)
  const lgaStats  = buildLGAStats(lgaData)
  const stateKPIs = computeKPIs(data)
  const lgaStat   = lgaStats.find(s => s.lga === lga) || null
  const allSorted = [...allStats].sort((a, b) => b.n - a.n)
  const period    = dateRange?.start ? `${dateRange.start} to ${dateRange.end}` : 'Full data collection period'
  const BRAND_HEX = '155c3a'

  const run   = (t, opts={}) => new TextRun({ text: String(t), size: 20, ...opts })
  const bold  = (t, opts={}) => new TextRun({ text: String(t), size: 20, bold: true, ...opts })
  const muted = (t) => new TextRun({ text: String(t), size: 18, color: '6b7280' })
  const p     = (text, opts={}) => new Paragraph({ children: [run(text)], spacing: { after: 60 }, ...opts })
  const space = () => new Paragraph({ text: '', spacing: { after: 80 } })

  const h1 = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: 'ffffff' })],
    shading: { type: ShadingType.SOLID, color: BRAND_HEX },
    spacing: { before: 160, after: 80 }, indent: { left: 80 },
  })
  const h2 = (text) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: 21, color: BRAND_HEX })],
    spacing: { before: 120, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e0e7ef' } },
  })
  const bul = (text, color) => new Paragraph({
    children: [new TextRun({ text, size: 19, color: color || '1a1a18' })],
    bullet: { level: 0 }, spacing: { after: 40 },
  })

  const makeHeaderRow = (labels) => new TableRow({
    tableHeader: true,
    children: labels.map(t => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 18, color: 'ffffff' })] })],
      shading: { type: ShadingType.SOLID, color: BRAND_HEX },
    }))
  })

  const dataRow = (cells, shade) => new TableRow({
    children: cells.map((t, i) => new TableCell({
      children: [new Paragraph({ children: [i === 0 ? muted(t) : bold(t)] })],
      shading: shade ? { type: ShadingType.SOLID, color: 'f0fdf4' } : undefined,
    }))
  })

  const kpiTable = (rows) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [makeHeaderRow(['Indicator', 'Value', 'Note'])].concat(
      rows.map((r, i) => dataRow(r, i % 2 === 0))
    ),
  })

  const children = []

  // Cover
  children.push(
    new Paragraph({ children: [new TextRun({ text: 'SARMAAN PROJECT', bold: true, size: 44, color: BRAND_HEX })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [run('LGA Coordinator Field Activity Report', { size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [bold(lga === 'all' ? 'Kano State - All 44 LGAs' : `${lga} LGA`, { size: 26, color: BRAND_HEX })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [muted(`Reporting period: ${period}`)], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [muted(`Generated: ${formatDate()}  ·  Kano State, Nigeria  ·  Kano AMR Programme`)], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  )

  // Section 1
  children.push(h1('Section 1 - Kano State Snapshot'),
    p(`Overall performance across all 44 LGA Coordinators during: ${period}`),
    kpiTable([
      ['Total reports submitted',        stateKPIs.total.toLocaleString(),              `across ${new Set(data.map(r=>r.date)).size} days`],
      ['Active LGAs',                    `${stateKPIs.activeLGAs} of 44`,              `${44-stateKPIs.activeLGAs} with zero submissions`],
      ['State inside-LGA rate',          `${stateKPIs.insidePct}%`,                    `${stateKPIs.inside} of ${stateKPIs.total} reports`],
      ['Total wards covered',            stateKPIs.wards.toLocaleString(),             `avg ${avg(allStats,'wards').toFixed(1)} per LGA`],
      ['Total settlements covered',      stateKPIs.settlements.toLocaleString(),       `avg ${avg(allStats,'sett').toFixed(1)} per LGA`],
      ['Total households visited',       stateKPIs.hh.toLocaleString(),               `avg ${Math.round(avg(allStats,'hh'))} per LGA`],
      ['Challenges flagged',             stateKPIs.challenges,                         `${pct(stateKPIs.challenges,stateKPIs.total)}% of submissions`],
      ['Critical issues escalated',      stateKPIs.critical,                           ''],
      ['Device / technical issues',      stateKPIs.device,                             ''],
      ['Security incidents',             stateKPIs.security,                           ''],
    ]),
    space(),
    h2('Top 5 LGAs - Submission Count'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      makeHeaderRow(['Rank','LGA','Submissions','Inside LGA %','Households'])
    ].concat(allSorted.slice(0,5).map((s,i) => dataRow([`${i+1}`, s.lga, s.n, `${pct(s.inside,s.n)}%`, s.hh.toLocaleString()], i%2===0))) }),
    space(),
    h2('Bottom 5 LGAs - Submission Count'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      makeHeaderRow(['Rank','LGA','Submissions','Inside LGA %','Note'])
    ].concat(allSorted.slice(-5).reverse().map((s,i) => dataRow([`${allSorted.length-i}`, s.lga, s.n, `${pct(s.inside,s.n)}%`, s.hh===0?'No HH data':''], i%2===0))) }),
    space(),
  )

  if (lga === 'all' || !lgaStat) {
    const doc2 = new Document({ sections: [{ properties: {}, children }] })
    const blob = await Packer.toBlob(doc2)
    saveAs(blob, `SARMAAN_Kano_State_Report_${new Date().toISOString().slice(0,10)}.docx`)
    return
  }

  const lgaInPct      = pct(lgaStat.inside, lgaStat.n)
  const lgaHHRank     = [...allStats].sort((a,b)=>b.hh-a.hh).findIndex(s=>s.lga===lga)+1
  const lgaSubRank    = allSorted.findIndex(s=>s.lga===lga)+1
  const activeStats2  = allStats.filter(s=>s.n>0)
  const stateAvgHH    = avg(activeStats2,'hh')
  const stateAvgSett  = avg(activeStats2,'sett')
  const stateAvgWards = avg(activeStats2,'wards')
  const stateAvgDCS   = avg(activeStats2,'dcs')
  const stateAvgForms = avg(activeStats2,'forms')
  const stateAvgInPct = pct(stateKPIs.inside, stateKPIs.total)
  const totalExpected = lgaStat.dcs + lgaStat.dcs_partial + lgaStat.dcs_absent
  const dcAttendRate  = pct(lgaStat.dcs, totalExpected)
  const formPerDC     = lgaStat.dcs > 0 ? (lgaStat.forms/lgaStat.dcs).toFixed(1) : 'N/A'
  const stateFormPerDC = stateAvgDCS > 0 ? (stateAvgForms/stateAvgDCS).toFixed(1) : 'N/A'
  const hhPerWard     = lgaStat.wards > 0 ? Math.round(lgaStat.hh/lgaStat.wards) : 0
  const settPerDay    = lgaStat.days.size > 0 ? (lgaStat.sett/lgaStat.days.size).toFixed(1) : '0'
  const allReportDates = [...new Set(raw.map(r=>r.date))].sort()
  const consistencyPct = pct(lgaStat.days.size, allReportDates.length)
  const days           = [...lgaStat.days].sort()
  const deviceYes      = lgaStat.devices || []
  const resolved       = deviceYes.filter(d=>d.resolved?.toLowerCase()==='yes').length
  const unresolved     = deviceYes.length - resolved
  const actKeys        = Object.keys(ACTIVITY_MAP)
  const actTotals      = actKeys.map(k=>({ key:k, label:ACTIVITY_MAP[k].label, count:lgaData.reduce((a,r)=>a+(r[k]||0),0) })).filter(a=>a.count>0).sort((a,b)=>b.count-a.count)

  const gaps = []
  for (let i = 1; i < allReportDates.length; i++) {
    const prev = allReportDates[i-1], curr = allReportDates[i]
    if (!lgaStat.days.has(curr) && lgaStat.days.has(prev)) {
      let end = curr, j = i
      while (j < allReportDates.length && !lgaStat.days.has(allReportDates[j])) { end = allReportDates[j]; j++ }
      gaps.push({ from: prev, to: end, days: j-i })
    }
  }
  const longestGap = gaps.length ? gaps.reduce((a,b)=>b.days>a.days?b:a) : null

  // Sections 2-9
  children.push(
    h1(`Section 2 - ${lga} LGA: Position in Kano State`),
    p(`Rankings against all 44 LGAs.`),
    kpiTable([
      ['Submission rank',         rankLabel(lgaSubRank, allSorted.length),             `${lgaStat.n} reports vs state avg ${Math.round(avg(allStats,'n'))}`],
      ['Household coverage rank', rankLabel(lgaHHRank, allStats.length),               `${lgaStat.hh.toLocaleString()} HH vs state avg ${Math.round(stateAvgHH).toLocaleString()}`],
      ['Inside LGA rate',         `${lgaInPct}% (state avg ${stateAvgInPct}%)`,       lgaInPct >= stateAvgInPct ? 'Above average' : 'Below average'],
      ['Settlements',             lgaStat.sett, compare(lgaStat.sett, stateAvgSett)],
      ['Wards',                   lgaStat.wards, compare(lgaStat.wards, stateAvgWards)],
      ['DC assignments',          lgaStat.dcs, compare(lgaStat.dcs, stateAvgDCS)],
    ]),
    space(),

    h1('Section 3 - Field Presence Analysis'),
    kpiTable([
      ['Reports from inside LGA',  `${lgaStat.inside} (${lgaInPct}%)`, `State avg: ${stateAvgInPct}%`],
      ['Reports from outside LGA', `${lgaStat.n - lgaStat.inside} (${100-lgaInPct}%)`, ''],
    ]),
    space(),

    h1('Section 4 - Coverage & Productivity'),
    kpiTable([
      ['Wards covered',           lgaStat.wards,          compare(lgaStat.wards, stateAvgWards)],
      ['Settlements covered',     lgaStat.sett,           compare(lgaStat.sett, stateAvgSett)],
      ['Households visited',      lgaStat.hh.toLocaleString(), compare(lgaStat.hh, stateAvgHH)],
      ['Households per ward',     hhPerWard || 'No data', 'depth of coverage'],
      ['Settlements per day',     settPerDay,             'pace of field coverage'],
    ]),
    space(),

    h1('Section 5 - Data Collector Team Management'),
    kpiTable([
      ['DC assignments',          lgaStat.dcs,            `avg ${(lgaStat.dcs/Math.max(lgaStat.days.size,1)).toFixed(1)}/day`],
      ['DC partial attendance',   lgaStat.dcs_partial,    totalExpected>0?`${pct(lgaStat.dcs_partial,totalExpected)}%`:'' ],
      ['DC absences',             lgaStat.dcs_absent,     totalExpected>0?`${pct(lgaStat.dcs_absent,totalExpected)}%`:'' ],
      ['DC attendance rate',      totalExpected>0?`${dcAttendRate}%`:'N/A', 'present/(present+partial+absent)'],
      ['Forms completed',         lgaStat.forms,          compare(lgaStat.forms, stateAvgForms)],
      ['Forms per DC',            formPerDC,              `state avg: ${stateFormPerDC}`],
    ]),
    space(),

    h1('Section 6 - Activity Profile'),
  )

  if (actTotals.length) {
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      makeHeaderRow(['Activity Type','Reports','% of Submissions'])
    ].concat(actTotals.map((a,i) => dataRow([a.label, a.count, `${pct(a.count,lgaStat.n)}%`], i%2===0))) }), space())
  } else {
    children.push(p('No activity type data recorded.'), space())
  }

  children.push(h1('Section 7 - Issues Deep Dive'))
  if (!lgaStat.challenges.length && !lgaStat.criticals.length && !lgaStat.devices.length && !lgaStat.securities.length) {
    children.push(p('No issues flagged for this LGA during the selected period.'))
  }
  lgaStat.challenges.forEach(c => children.push(
    new Paragraph({ children: [bold(`Challenge - ${c.date}: `, { color: 'b45309' }), run(c.desc)], spacing: { after: 60 } })
  ))
  lgaStat.criticals.forEach(c => children.push(
    new Paragraph({ children: [bold(`Critical - ${c.date}: `, { color: 'dc2626' }), run(c.desc)], spacing: { after: 60 } })
  ))
  lgaStat.devices.forEach(d => children.push(
    new Paragraph({ children: [bold(`Device (${cap(d.type)||'Issue'}) - ${d.date}: `, { color: '7c3aed' }), run(d.desc)] , spacing: { after: 40 }}),
    new Paragraph({ children: [run(d.resolved?.toLowerCase()==='yes' ? `✓ Resolved: ${d.action}` : `⏳ Pending: ${d.action||'No action recorded'}`, { italics: true, color: d.resolved?.toLowerCase()==='yes'?'155c3a':'d97706' })] , spacing: { after: 60 }})
  ))
  lgaStat.securities.forEach(s => children.push(
    new Paragraph({ children: [bold(`Security - ${s.date}${s.location?' · '+s.location:''}: `, { color: 'ea580c' }), run(s.desc||'')] , spacing: { after: 40 }}),
    s.action ? new Paragraph({ children: [run(`Action: ${s.action}`, { italics: true, color: '6b7280' })] , spacing: { after: 60 }}) : space()
  ))

  children.push(
    space(),
    h1('Section 8 - Consistency & Submission Gaps'),
    kpiTable([
      ['Active reporting days',     lgaStat.days.size,   `of ${allReportDates.length} total`],
      ['Consistency rate',          `${consistencyPct}%`, consistencyPct>=80?'Strong':consistencyPct>=60?'Moderate':'Needs attention'],
      ['First submission',          days[0]||'N/A',      ''],
      ['Last submission',           days[days.length-1]||'N/A', ''],
      ['Submission gaps',           gaps.length,         gaps.length===0?'None detected':'See details below'],
      ['Longest gap',               longestGap ? `${longestGap.days} days` : 'None', longestGap ? `${longestGap.from} to ${longestGap.to}` : ''],
    ]),
    space(),
  )
  if (gaps.length) {
    children.push(h2('Gap Details'))
    gaps.forEach(g => children.push(bul(`${g.from} → ${g.to}: ${g.days} day${g.days>1?'s':''} without submission`)))
    children.push(space())
  }

  children.push(h1('Section 9 - Recommendations'))
  const recs = []
  if (lgaInPct < stateAvgInPct) recs.push(`Field presence: Inside-LGA rate of ${lgaInPct}% is below state average (${stateAvgInPct}%). Reinforce in-LGA presence expectations with the coordinator.`)
  if (lgaStat.hh === 0) recs.push(`Coverage data: No household data recorded. Urgently confirm the coordinator is selecting "Field Coordination & Implementation" in the daily form.`)
  if (lgaStat.dcs_absent > lgaStat.dcs * 0.15) recs.push(`DC attendance: ${lgaStat.dcs_absent} absences recorded. Investigate cause and ensure adequate DC mobilisation.`)
  if (unresolved > 0) recs.push(`Device issues: ${unresolved} unresolved device issue${unresolved>1?'s':''} require technical team follow-up.`)
  if (consistencyPct < 70) recs.push(`Submission consistency: At ${consistencyPct}%, significant reporting gaps exist. Review with coordinator and address unplanned absences.`)
  if (parseFloat(formPerDC) > 0 && parseFloat(stateFormPerDC) > 0 && parseFloat(formPerDC) < parseFloat(stateFormPerDC)*0.7) recs.push(`Form completion: Forms per DC (${formPerDC}) is well below state average (${stateFormPerDC}). Investigate survey completion pace.`)
  if (lgaStat.criticals.length > 0) recs.push(`Critical escalations: ${lgaStat.criticals.length} issue${lgaStat.criticals.length>1?'s':''} flagged. Confirm each has been actioned by the state team.`)
  if (recs.length === 0) recs.push(`${lga} is performing well. Continue monitoring to sustain current levels and consider sharing practices with lower-performing LGAs.`)
  recs.forEach((r, i) => children.push(bul(`${i+1}. ${r}`)))
  children.push(space())

  // Footer paragraph
  children.push(new Paragraph({
    children: [muted(`Generated by SARMAAN LC Dashboard · eHealth Africa · ${formatDate()}`)],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e0e7ef' } },
    spacing: { before: 160 },
  }))

  const doc2 = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        heading1: { run: { font: 'Arial', size: 22, bold: true, color: 'ffffff' } },
        heading2: { run: { font: 'Arial', size: 20, bold: true, color: BRAND_HEX } },
      }
    }
  })
  const blob = await Packer.toBlob(doc2)
  saveAs(blob, `SARMAAN_${lga.replace(/\s+/g,'_')}_Report_${new Date().toISOString().slice(0,10)}.docx`)
}
