import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { getContractors, createContractor, updateContractor, deleteContractor } from '../hooks/useApi'

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

export default function Contractors() {
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '' })
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setContractors(await getContractors())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await updateContractor(editing.id, form)
      } else {
        await createContractor(form)
      }
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', company: '', phone: '', email: '' })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, company: c.company || '', phone: c.phone || '', email: c.email || '' })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this contractor?')) return
    try {
      await deleteContractor(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h2 style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 500 }} className="sm:text-3xl">Contractors</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', company: '', phone: '', email: '' }) }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium btn-ring"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '12px' }}
        >
          <Plus size={18} strokeWidth={2} /> Add Contractor
        </button>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 text-sm font-medium" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 card-elevated" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base" style={{ fontWeight: 500 }}>{editing ? 'Edit Contractor' : 'New Contractor'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-1.5" style={{ borderRadius: '8px', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={inputStyle} />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            <div className="sm:col-span-2">
              <button type="submit" className="px-6 py-2.5 text-sm font-medium btn-ring"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '10px' }}>
                {editing ? 'Update Contractor' : 'Create Contractor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : contractors.length === 0 ? (
        <div className="text-center py-16" style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No contractors yet. Add one to get started.</p>
        </div>
      ) : (
        <>
        {/* Mobile card list */}
        <div className="sm:hidden space-y-3">
          {contractors.map(c => (
            <div key={c.id} className="card-elevated" style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '14px',
            }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{c.name}</p>
                  {c.company && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.company}</p>}
                </div>
                <span className="inline-flex items-center justify-center text-xs font-medium flex-shrink-0"
                  style={{ width: 32, height: 32, borderRadius: '24px', background: 'var(--muted)', color: 'var(--primary)' }}>
                  {c.laborer_count}
                </span>
              </div>
              {(c.phone || c.email) && (
                <div className="mt-2 space-y-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {c.phone && <p className="truncate">📞 {c.phone}</p>}
                  {c.email && <p className="truncate">✉️ {c.email}</p>}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => handleEdit(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium"
                  style={{ background: 'var(--muted)', borderRadius: '10px', color: 'var(--foreground)' }}>
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(c.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium"
                  style={{ background: '#fef2f2', borderRadius: '10px', color: 'var(--destructive)' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden sm:block card-elevated" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Company</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phone</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Laborers</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {contractors.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }} className="last:border-0">
                  <td className="px-5 py-4 font-medium" style={{ color: 'var(--foreground)' }}>{c.name}</td>
                  <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>{c.company || '—'}</td>
                  <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                  <td className="px-5 py-4" style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 text-xs font-medium"
                      style={{ borderRadius: '24px', background: 'var(--muted)', color: 'var(--primary)' }}>
                      {c.laborer_count}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => handleEdit(c)} className="p-2" style={{ borderRadius: '8px', color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2" style={{ borderRadius: '8px', color: 'var(--destructive)' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
