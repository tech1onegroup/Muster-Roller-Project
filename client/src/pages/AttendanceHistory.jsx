import { useState, useEffect } from 'react'
import { Download, Pencil, X } from 'lucide-react'
import { getAttendanceRange, getContractors, exportCSV, updateAttendance } from '../hooks/useApi'

const inputStyle = {
  padding: '10px 14px',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  fontSize: '14px',
  background: 'var(--input)',
  color: 'var(--foreground)',
  width: '100%',
}

const STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'not_productive', label: 'Not Productive' },
]

// Convert ISO timestamp to value usable by <input type="datetime-local"> (local time, no TZ).
function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local) {
  if (!local) return ''
  // datetime-local has no timezone; treat as local and convert to ISO
  const d = new Date(local)
  if (isNaN(d.getTime())) return ''
  return d.toISOString()
}

function EditModal({ record, onClose, onSave }) {
  const [status, setStatus] = useState(record.status || 'present')
  const [checkIn, setCheckIn] = useState(isoToLocalInput(record.check_in_time))
  const [checkOut, setCheckOut] = useState(isoToLocalInput(record.check_out_time))
  const [overtime, setOvertime] = useState(record.overtime_hours ?? 0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      await onSave({
        status,
        check_in_time: localInputToIso(checkIn),
        check_out_time: localInputToIso(checkOut),
        overtime_hours: overtime,
      })
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
      }}
      className="sm:!items-center sm:!p-5"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom)) 20px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        className="sm:!rounded-3xl sm:!p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--foreground)' }}>Edit attendance</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ width: 40, height: 40, borderRadius: '999px', background: 'var(--muted)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p className="mb-4" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {record.laborer_name} · {record.work_date}
        </p>

        {err && (
          <div className="mb-3 px-3 py-2 text-sm" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '10px' }}>{err}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(s => (
                <button type="button" key={s.value}
                  onClick={() => setStatus(s.value)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: status === s.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: status === s.value ? 'rgba(118,34,36,0.06)' : 'var(--card)',
                    color: status === s.value ? 'var(--primary)' : 'var(--foreground)',
                    minHeight: '48px',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Check In</label>
            <input type="datetime-local" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Check Out</label>
            <input type="datetime-local" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Overtime (hours)</label>
            <input type="number" min="0" step="0.5" inputMode="decimal"
              value={overtime} onChange={e => setOvertime(e.target.value)} style={inputStyle} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 text-sm font-medium"
              style={{ background: 'var(--muted)', color: 'var(--foreground)', borderRadius: '12px', border: 'none', minHeight: '48px' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 text-sm font-medium"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '12px', border: 'none', minHeight: '48px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AttendanceHistory() {
  const [records, setRecords] = useState([])
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterContractor, setFilterContractor] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

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

  const handleSave = async (patch) => {
    await updateAttendance(editing.id, patch)
    await load()
  }

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

  const editedPill = (r) => r.edited ? (
    <span title={r.edited_at ? `Edited at ${new Date(r.edited_at).toLocaleString()}` : 'Edited'}
      style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '24px', fontSize: '10px', fontWeight: 500, background: 'var(--muted)', color: 'var(--text-muted)', marginLeft: '6px' }}>
      Edited
    </span>
  ) : null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h2 style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 500 }} className="sm:text-3xl">Attendance History</h2>
        <a href={exportCSV(startDate, endDate, filterContractor || undefined)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium btn-ring"
          style={{ background: 'var(--dark)', color: 'var(--primary-foreground)', borderRadius: '12px', textDecoration: 'none', minHeight: '48px' }}
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '24px', fontSize: '11px', fontWeight: 500, ...statusStyle(r.status) }}>
                        {statusLabel(r.status)}
                      </span>
                      {editedPill(r)}
                      <button onClick={() => setEditing(r)} aria-label="Edit record"
                        style={{ width: 36, height: 36, borderRadius: '999px', background: 'var(--muted)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground)' }}>
                        <Pencil size={15} />
                      </button>
                    </div>
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
                    {['Laborer','Contractor','Check In','Check Out','Hours','Status','OT',''].map((h, i) => (
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
                        {editedPill(r)}
                      </td>
                      <td className="px-5 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{r.overtime_hours || 0}h</td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => setEditing(r)} aria-label="Edit record"
                          style={{ width: 36, height: 36, borderRadius: '8px', background: 'transparent', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {editing && (
        <EditModal record={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </div>
  )
}
