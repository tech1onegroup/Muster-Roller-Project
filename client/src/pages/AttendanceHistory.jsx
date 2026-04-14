import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { getAttendanceRange, getContractors, exportCSV } from '../hooks/useApi'

const inputStyle = {
  padding: '10px 14px',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  fontSize: '14px',
  background: 'var(--input)',
  color: 'var(--foreground)',
  width: '100%',
}

export default function AttendanceHistory() {
  const [records, setRecords] = useState([])
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterContractor, setFilterContractor] = useState('')
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [recs, cons] = await Promise.all([
        getAttendanceRange(startDate, endDate, filterContractor || undefined),
        getContractors(),
      ])
      setRecords(recs)
      setContractors(cons)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [startDate, endDate, filterContractor])

  const grouped = {}
  records.forEach(r => {
    if (!grouped[r.work_date]) grouped[r.work_date] = []
    grouped[r.work_date].push(r)
  })
  const dates = Object.keys(grouped).sort().reverse()

  const statusStyle = (s) => {
    if (s === 'present') return { background: '#f0fdf4', color: '#15803d' }
    if (s === 'half_day') return { background: '#fffbeb', color: '#a16207' }
    if (s === 'not_productive') return { background: '#fef2f2', color: 'var(--destructive)' }
    return { background: 'var(--muted)', color: 'var(--text-muted)' }
  }

  const statusLabel = (s) => {
    if (s === 'present') return 'Present'
    if (s === 'half_day') return 'Half Day'
    if (s === 'not_productive') return 'Not Productive'
    return s || '—'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h2 style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 500 }} className="sm:text-3xl">Attendance History</h2>
        <a href={exportCSV(startDate, endDate, filterContractor || undefined)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium btn-ring"
          style={{ background: 'var(--dark)', color: 'var(--primary-foreground)', borderRadius: '12px', textDecoration: 'none' }}
          download>
          <Download size={18} strokeWidth={2} /> Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Contractor</label>
          <select value={filterContractor} onChange={e => setFilterContractor(e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}>
            <option value="">All Contractors</option>
            {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 text-sm font-medium" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : dates.length === 0 ? (
        <div className="text-center py-16" style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No attendance records found.</p>
        </div>
      ) : (
        dates.map(date => (
          <div key={date} className="mb-8">
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              {new Date(date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {grouped[date].map(r => (
                <div key={r.id} className="card-elevated" style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '12px',
                }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm" style={{ color: 'var(--foreground)' }}>{r.laborer_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.contractor_name || '—'}</p>
                    </div>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '24px', fontSize: '11px', fontWeight: 500, flexShrink: 0, ...statusStyle(r.status) }}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>In: {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    <span>Out: {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    <span>{r.hours_worked ? `${r.hours_worked.toFixed(1)}h` : '—'}</span>
                    {r.overtime_hours > 0 && <span>OT: {r.overtime_hours}h</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden sm:block card-elevated overflow-x-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Laborer','Contractor','Check In','Check Out','Hours','Status','OT'].map((h, i) => (
                      <th key={i} className={`px-5 py-3 text-xs font-medium uppercase tracking-wider ${['Check In','Check Out','Hours','Status','OT'].includes(h) ? 'text-center' : 'text-left'}`}
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped[date].map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} className="last:border-0">
                      <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--foreground)' }}>{r.laborer_name}</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text-muted)' }}>{r.contractor_name || '—'}</td>
                      <td className="px-5 py-3.5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center" style={{ color: 'var(--foreground)' }}>
                        {r.hours_worked ? r.hours_worked.toFixed(1) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '24px', fontSize: '12px', fontWeight: 500, ...statusStyle(r.status) }}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{r.overtime_hours || 0}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
