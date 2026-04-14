import { useState, useEffect } from 'react'
import { Plus, X, UserCheck, UserX, RefreshCw, Pencil, AlertTriangle } from 'lucide-react'
import { getLaborers, createLaborer, getContractors, updateLaborerStatus, reEnrollFace, updateLaborer } from '../hooks/useApi'

const inputStyle = {
  padding: '10px 14px',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  fontSize: '14px',
  background: 'var(--input)',
  color: 'var(--foreground)',
  lineHeight: '1.6',
  width: '100%',
}

const selectStyle = { ...inputStyle, appearance: 'auto' }

// Hoisted out of Laborers so re-renders don't remount the form and steal
// focus from inputs after every keystroke.
function FormPanel({ title, onClose, onSubmit, formState, setFormState, isCreate, contractors, setPhoto, setAadhaarPhoto }) {
  return (
    <div className="mb-8 card-elevated" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base" style={{ fontWeight: 500 }}>{title}</h3>
        <button onClick={onClose} className="p-1.5" style={{ borderRadius: '8px', color: 'var(--text-muted)' }}><X size={18} /></button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <input required placeholder="Name *" value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} style={inputStyle} />
        <select required value={formState.contractor_id} onChange={e => setFormState({ ...formState, contractor_id: e.target.value })} style={selectStyle}>
          <option value="">Select Contractor *</option>
          {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Role (mason, electrician...)" value={formState.role} onChange={e => setFormState({ ...formState, role: e.target.value })} style={inputStyle} />
        <input
          required
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Daily Wage (INR) *"
          value={formState.daily_wage}
          onChange={e => setFormState({ ...formState, daily_wage: e.target.value })}
          style={inputStyle}
        />
        <select value={formState.shift_type} onChange={e => setFormState({ ...formState, shift_type: e.target.value })} style={selectStyle}>
          <option value="8hr">8 Hour Shift</option>
          <option value="12hr">12 Hour Shift</option>
        </select>
        <input placeholder="Phone" value={formState.phone} onChange={e => setFormState({ ...formState, phone: e.target.value })} style={inputStyle} />
        <input placeholder="Emergency Contact" value={formState.emergency_contact} onChange={e => setFormState({ ...formState, emergency_contact: e.target.value })} style={inputStyle} />
        {isCreate && (
          <>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Face Photo *</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} className="text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Aadhaar Card (optional)</label>
              <input type="file" accept="image/*" onChange={e => setAadhaarPhoto(e.target.files[0])} className="text-sm" />
            </div>
          </>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" className="px-6 py-2.5 text-sm font-medium btn-ring"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '10px' }}>
            {isCreate ? 'Create Laborer' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function IconBtn({ onClick, title, children, color }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      style={{
        width: 44, height: 44,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '10px',
        background: 'var(--muted)',
        border: 'none',
        color: color || 'var(--foreground)',
        cursor: 'pointer',
      }}>
      {children}
    </button>
  )
}

export default function Laborers() {
  const [laborers, setLaborers] = useState([])
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterContractor, setFilterContractor] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', contractor_id: '', role: '', daily_wage: '',
    shift_type: '8hr', phone: '', emergency_contact: '',
  })
  const [photo, setPhoto] = useState(null)
  const [aadhaarPhoto, setAadhaarPhoto] = useState(null)
  const [editingLaborer, setEditingLaborer] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '', contractor_id: '', role: '', daily_wage: '',
    shift_type: '8hr', phone: '', emergency_contact: '',
  })

  const load = async () => {
    try {
      const params = {}
      if (filterContractor) params.contractor_id = filterContractor
      if (filterStatus) params.status = filterStatus
      const [labs, cons] = await Promise.all([getLaborers(params), getContractors()])
      setLaborers(labs)
      setContractors(cons)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterContractor, filterStatus])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (photo) fd.append('photo', photo)
    if (aadhaarPhoto) fd.append('aadhaar_photo', aadhaarPhoto)
    try {
      await createLaborer(fd)
      setShowForm(false)
      setForm({ name: '', contractor_id: '', role: '', daily_wage: '', shift_type: '8hr', phone: '', emergency_contact: '' })
      setPhoto(null)
      setAadhaarPhoto(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const toggleStatus = async (id, current) => {
    try {
      await updateLaborerStatus(id, current === 'active' ? 'inactive' : 'active')
      load()
    } catch (e) { setError(e.message) }
  }

  const handleReEnroll = async (id) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const fd = new FormData()
      fd.append('photo', file)
      try { await reEnrollFace(id, fd); load() }
      catch (err) { setError(err.message) }
    }
    input.click()
  }

  const isAbsentLong = (lastDate) => {
    if (!lastDate) return true
    const last = new Date(lastDate + 'T00:00')
    const diffDays = (new Date() - last) / (1000 * 60 * 60 * 24)
    return diffDays >= 30
  }

  const startEdit = (laborer) => {
    setEditingLaborer(laborer.id)
    setEditForm({
      name: laborer.name || '', contractor_id: laborer.contractor_id || '',
      role: laborer.role || '', daily_wage: laborer.daily_wage || '',
      shift_type: laborer.shift_type || '8hr', phone: laborer.phone || '',
      emergency_contact: laborer.emergency_contact || '',
    })
    setShowForm(false)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(editForm).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v) })
    try { await updateLaborer(editingLaborer, fd); setEditingLaborer(null); load() }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h2 style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 500 }} className="sm:text-3xl">Laborers</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 items-stretch">
          <select value={filterContractor} onChange={e => setFilterContractor(e.target.value)}
            className="flex-1 sm:flex-none min-w-0"
            style={{ ...selectStyle, width: 'auto', padding: '10px 12px' }}>
            <option value="">All Contractors</option>
            {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none min-w-0"
            style={{ ...selectStyle, width: 'auto', padding: '10px 12px' }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </select>
          <button onClick={() => setShowForm(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium btn-ring"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '12px' }}>
            <Plus size={18} strokeWidth={2} /> Add Laborer
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 text-sm font-medium" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {showForm && (
        <FormPanel
          title="New Laborer"
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          formState={form}
          setFormState={setForm}
          isCreate
          contractors={contractors}
          setPhoto={setPhoto}
          setAadhaarPhoto={setAadhaarPhoto}
        />
      )}
      {editingLaborer && (
        <FormPanel
          title="Edit Laborer"
          onClose={() => setEditingLaborer(null)}
          onSubmit={handleEditSubmit}
          formState={editForm}
          setFormState={setEditForm}
          contractors={contractors}
          setPhoto={setPhoto}
          setAadhaarPhoto={setAadhaarPhoto}
        />
      )}

      {loading ? (
        <p className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : laborers.length === 0 ? (
        <div className="text-center py-16" style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No laborers found.</p>
        </div>
      ) : (
        <>
        {/* Mobile card list */}
        <div className="sm:hidden space-y-3">
          {laborers.map(l => {
            const absent = l.status === 'active' && isAbsentLong(l.last_attendance_date)
            return (
              <div key={l.id} className="card-elevated" style={{
                background: absent ? '#fef2f2' : 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '14px',
              }}>
                <div className="flex items-start gap-3">
                  {l.photo_path ? (
                    <img src={`/uploads/${l.photo_path}`} alt="" style={{ width: 52, height: 52, borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>N/A</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{l.name}</p>
                      <span style={{
                        padding: '2px 8px', borderRadius: '24px', fontSize: '11px', fontWeight: 500, flexShrink: 0,
                        background: l.status === 'active' ? '#f0fdf4' : 'var(--muted)',
                        color: l.status === 'active' ? '#15803d' : 'var(--text-muted)',
                      }}>
                        {l.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{l.contractor_name || '—'} · {l.role || '—'}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>&#8377;{l.daily_wage}/day</span>
                      <span>{l.shift_type}</span>
                      {absent && (
                        <span className="inline-flex items-center gap-1" style={{ color: 'var(--destructive)' }}>
                          <AlertTriangle size={12} /> Action
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => startEdit(l)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium"
                    style={{ background: 'var(--muted)', borderRadius: '10px', color: 'var(--foreground)' }}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => handleReEnroll(l.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium"
                    style={{ background: 'var(--muted)', borderRadius: '10px', color: 'var(--foreground)' }}>
                    <RefreshCw size={14} /> Re-enroll
                  </button>
                  <button onClick={() => toggleStatus(l.id, l.status)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium"
                    style={{
                      background: l.status === 'active' ? '#fef2f2' : '#f0fdf4',
                      color: l.status === 'active' ? 'var(--destructive)' : '#15803d',
                      borderRadius: '10px',
                    }}>
                    {l.status === 'active' ? <><UserX size={14} /> Off</> : <><UserCheck size={14} /> On</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden sm:block card-elevated overflow-x-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Photo','Name','Contractor','Role','Wage','Shift','Status','Alert',''].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-xs font-medium uppercase tracking-wider ${h === 'Wage' ? 'text-right' : h === '' ? '' : ['Shift','Status','Alert'].includes(h) ? 'text-center' : 'text-left'}`}
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laborers.map(l => {
                const absent = l.status === 'active' && isAbsentLong(l.last_attendance_date)
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', background: absent ? '#fef2f2' : 'transparent' }}>
                    <td className="px-5 py-4">
                      {l.photo_path ? (
                        <img src={`/uploads/${l.photo_path}`} alt="" style={{ width: 40, height: 40, borderRadius: '12px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>N/A</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium" style={{ color: 'var(--foreground)' }}>{l.name}</td>
                    <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>{l.contractor_name || '—'}</td>
                    <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>{l.role || '—'}</td>
                    <td className="px-5 py-4 text-right" style={{ color: 'var(--foreground)' }}>&#8377;{l.daily_wage}</td>
                    <td className="px-5 py-4 text-center" style={{ color: 'var(--text-muted)' }}>{l.shift_type}</td>
                    <td className="px-5 py-4 text-center">
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '24px', fontSize: '12px', fontWeight: 500,
                        background: l.status === 'active' ? '#f0fdf4' : 'var(--muted)',
                        color: l.status === 'active' ? '#15803d' : 'var(--text-muted)',
                      }}>
                        {l.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {absent ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '24px', fontSize: '12px', fontWeight: 500, background: '#fef2f2', color: 'var(--destructive)' }}>
                          <AlertTriangle size={12} /> Action Needed
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 justify-end">
                        <IconBtn onClick={() => startEdit(l)} title="Edit laborer"><Pencil size={15} /></IconBtn>
                        <IconBtn onClick={() => handleReEnroll(l.id)} title="Re-enroll face"><RefreshCw size={15} /></IconBtn>
                        <IconBtn onClick={() => toggleStatus(l.id, l.status)} title={l.status === 'active' ? 'Deactivate' : 'Activate'}
                          color={l.status === 'active' ? 'var(--destructive)' : '#15803d'}>
                          {l.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
