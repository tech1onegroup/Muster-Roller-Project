import { useState, useEffect } from 'react'
import {
  Plus, X, Trash2, Pencil, FileText, Download, ChevronLeft, Check, XCircle,
  Star, AlertTriangle, Trophy, BarChart3, Package, Building2, Upload, Zap
} from 'lucide-react'
import {
  getVendors, createVendor, getProjects, createProject, deleteProject,
  approveProject, rejectProject, getQuotes, createQuote, deleteQuote,
  getQuoteItems, createQuoteItem, updateQuoteItem, deleteQuoteItem,
  getComparison, exportComparisonCSV,
} from '../hooks/useApi'

const inputStyle = {
  padding: '10px 14px', border: '1px solid var(--input-border)', borderRadius: '12px',
  fontSize: '14px', background: 'var(--input)', color: 'var(--foreground)', lineHeight: '1.6', width: '100%',
}
const selectStyle = { ...inputStyle, appearance: 'auto' }
const btnPrimary = {
  background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '12px',
  padding: '10px 20px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer',
}
const btnSecondary = {
  background: 'var(--secondary)', color: 'var(--secondary-foreground)', borderRadius: '12px',
  padding: '10px 20px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer',
}
const cardStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px',
}
const statusColors = {
  draft: { bg: 'var(--muted)', color: 'var(--text-muted)' },
  comparing: { bg: '#dbeafe', color: '#1d4ed8' },
  approved: { bg: '#f0fdf4', color: '#15803d' },
  rejected: { bg: '#fef2f2', color: 'var(--destructive)' },
}

export default function Quotations() {
  const [view, setView] = useState('projects') // projects | detail | vendors | quickCompare
  const [projects, setProjects] = useState([])
  const [vendors, setVendors] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewVendor, setShowNewVendor] = useState(false)
  const [showNewQuote, setShowNewQuote] = useState(false)
  const [showItems, setShowItems] = useState(null) // quote id
  const [items, setItems] = useState([])
  const [showApproval, setShowApproval] = useState(null) // 'approve' | 'reject'
  const [projForm, setProjForm] = useState({ title: '', description: '' })
  const [vendorForm, setVendorForm] = useState({ name: '', company: '', phone: '', email: '', gst_number: '', address: '' })
  const [quoteForm, setQuoteForm] = useState({ vendor_id: '', gst_type: 'exclusive', gst_percent: 18, logistics_cost: 0, installation_cost: 0, other_charges: 0, payment_terms: '', delivery_days: '', warranty_months: '', validity_days: 30, notes: '' })
  const [itemForm, setItemForm] = useState({ item_description: '', specification: '', brand: '', hsn_code: '', quantity: 1, unit: 'Nos', gross_rate: 0, discount_percent: 0 })
  const [approvalForm, setApprovalForm] = useState({ vendor_id: '', notes: '' })
  const [quoteFile, setQuoteFile] = useState(null)

  // Quick Compare state
  const emptyQuickVendor = () => ({ file: null, fileName: '', vendorName: '', company: '', gstNumber: '', gstType: 'exclusive', gstPercent: 18, totalAmount: 0, brandQuality: 'branded', materialGrade: 'standard', paymentTerms: '', deliveryDays: '', warrantyMonths: '', items: [] })
  const emptyQuickItem = () => ({ description: '', brand: '', make: '', hsn: '', qty: 1, unit: 'Nos', rate: 0 })
  const [quickVendors, setQuickVendors] = useState([emptyQuickVendor(), emptyQuickVendor()])
  const [quickResult, setQuickResult] = useState(null)
  const [quickProjectTitle, setQuickProjectTitle] = useState('')

  const loadProjects = async () => {
    try {
      const [p, v] = await Promise.all([getProjects(), getVendors()])
      setProjects(p); setVendors(v)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProjects() }, [])

  const openProject = async (proj) => {
    setActiveProject(proj); setView('detail'); setComparison(null)
    try { setQuotes(await getQuotes(proj.id)) } catch (e) { setError(e.message) }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault(); setError('')
    try { await createProject(projForm); setProjForm({ title: '', description: '' }); setShowNewProject(false); loadProjects() }
    catch (e) { setError(e.message) }
  }

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project and all its quotes?')) return
    try { await deleteProject(id); loadProjects() } catch (e) { setError(e.message) }
  }

  const handleCreateVendor = async (e) => {
    e.preventDefault(); setError('')
    try { await createVendor(vendorForm); setVendorForm({ name: '', company: '', phone: '', email: '', gst_number: '', address: '' }); setShowNewVendor(false); loadProjects() }
    catch (e) { setError(e.message) }
  }

  const handleCreateQuote = async (e) => {
    e.preventDefault(); setError('')
    const fd = new FormData()
    Object.entries(quoteForm).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v) })
    if (quoteFile) fd.append('file', quoteFile)
    try {
      await createQuote(activeProject.id, fd)
      setShowNewQuote(false); setQuoteFile(null)
      setQuoteForm({ vendor_id: '', gst_type: 'exclusive', gst_percent: 18, logistics_cost: 0, installation_cost: 0, other_charges: 0, payment_terms: '', delivery_days: '', warranty_months: '', validity_days: 30, notes: '' })
      setQuotes(await getQuotes(activeProject.id))
    } catch (e) { setError(e.message) }
  }

  const handleDeleteQuote = async (qid) => {
    if (!confirm('Delete this quote?')) return
    try { await deleteQuote(qid); setQuotes(await getQuotes(activeProject.id)) } catch (e) { setError(e.message) }
  }

  const openItems = async (qid) => {
    setShowItems(qid)
    try { setItems(await getQuoteItems(qid)) } catch (e) { setError(e.message) }
  }

  const handleAddItem = async (e) => {
    e.preventDefault(); setError('')
    try {
      await createQuoteItem(showItems, itemForm)
      setItemForm({ item_description: '', specification: '', brand: '', hsn_code: '', quantity: 1, unit: 'Nos', gross_rate: 0, discount_percent: 0 })
      setItems(await getQuoteItems(showItems))
      setQuotes(await getQuotes(activeProject.id))
    } catch (e) { setError(e.message) }
  }

  const handleDeleteItem = async (iid) => {
    try { await deleteQuoteItem(iid); setItems(await getQuoteItems(showItems)); setQuotes(await getQuotes(activeProject.id)) }
    catch (e) { setError(e.message) }
  }

  const loadComparison = async () => {
    try { setComparison(await getComparison(activeProject.id)) } catch (e) { setError(e.message) }
  }

  const handleApprove = async () => {
    try { await approveProject(activeProject.id, approvalForm); setShowApproval(null); loadProjects(); setView('projects') }
    catch (e) { setError(e.message) }
  }

  const handleReject = async () => {
    try { await rejectProject(activeProject.id, { notes: approvalForm.notes }); setShowApproval(null); loadProjects(); setView('projects') }
    catch (e) { setError(e.message) }
  }

  const updateQuickVendor = (idx, field, value) => {
    setQuickVendors(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  const addQuickItem = (vendorIdx) => {
    setQuickVendors(prev => prev.map((v, i) => i === vendorIdx ? { ...v, items: [...v.items, emptyQuickItem()] } : v))
  }

  const updateQuickItem = (vendorIdx, itemIdx, field, value) => {
    setQuickVendors(prev => prev.map((v, i) => {
      if (i !== vendorIdx) return v
      const newItems = v.items.map((it, j) => j === itemIdx ? { ...it, [field]: value } : it)
      return { ...v, items: newItems }
    }))
  }

  const removeQuickItem = (vendorIdx, itemIdx) => {
    setQuickVendors(prev => prev.map((v, i) => {
      if (i !== vendorIdx) return v
      return { ...v, items: v.items.filter((_, j) => j !== itemIdx) }
    }))
  }

  const runQuickCompare = () => {
    const filled = quickVendors.filter(v => v.vendorName && (v.totalAmount > 0 || v.items.length > 0))
    if (filled.length < 2) { setError('Need at least 2 vendors with data to compare'); return }
    setError('')

    const analyzed = filled.map(v => {
      const itemTotal = v.items.reduce((sum, it) => sum + (it.rate * it.qty), 0)
      const baseAmount = v.totalAmount || itemTotal
      const gstAmt = v.gstType === 'exclusive' ? baseAmount * (v.gstPercent / 100) : v.gstType === 'inclusive' ? baseAmount - (baseAmount / (1 + v.gstPercent / 100)) : 0
      const netAmount = v.gstType === 'inclusive' ? baseAmount - gstAmt : baseAmount
      const totalLanded = netAmount + gstAmt

      const brandedItems = v.items.filter(it => it.brand && !['generic', 'local', 'unknown'].includes(it.brand.toLowerCase()))
      const brandScore = v.items.length > 0 ? Math.round((brandedItems.length / v.items.length) * 100) : (v.brandQuality === 'branded' ? 80 : v.brandQuality === 'mixed' ? 50 : 20)
      const qualityScore = v.materialGrade === 'premium' ? 95 : v.materialGrade === 'standard' ? 70 : 40
      const complianceScore = (v.gstNumber ? 30 : 0) + (v.gstType !== 'not_mentioned' ? 20 : 0) + (v.items.filter(it => it.hsn).length > 0 ? 25 : 0) + (v.warrantyMonths ? 25 : 0)

      return { ...v, baseAmount, gstAmt: Math.round(gstAmt * 100) / 100, netAmount: Math.round(netAmount * 100) / 100, totalLanded: Math.round(totalLanded * 100) / 100, brandScore, qualityScore, complianceScore }
    })

    // Determine winners
    const cheapest = [...analyzed].sort((a, b) => a.totalLanded - b.totalLanded)[0]
    const bestBrand = [...analyzed].sort((a, b) => b.brandScore - a.brandScore)[0]
    const bestQuality = [...analyzed].sort((a, b) => b.qualityScore - a.qualityScore)[0]
    const bestCompliance = [...analyzed].sort((a, b) => b.complianceScore - a.complianceScore)[0]

    // Overall score (40% price, 25% quality, 20% brand, 15% compliance)
    const maxPrice = Math.max(...analyzed.map(v => v.totalLanded))
    analyzed.forEach(v => {
      const priceScore = maxPrice > 0 ? ((maxPrice - v.totalLanded) / maxPrice) * 100 : 50
      v.overallScore = Math.round(priceScore * 0.4 + v.qualityScore * 0.25 + v.brandScore * 0.2 + v.complianceScore * 0.15)
    })
    const recommended = [...analyzed].sort((a, b) => b.overallScore - a.overallScore)[0]

    const risks = []
    analyzed.forEach(v => {
      if (!v.gstNumber) risks.push(`${v.vendorName}: GST number missing`)
      if (v.gstType === 'not_mentioned') risks.push(`${v.vendorName}: GST treatment unclear`)
      if (v.brandScore < 30) risks.push(`${v.vendorName}: Mostly generic/unbranded materials`)
      if (v.qualityScore < 50) risks.push(`${v.vendorName}: Economy grade materials — durability risk`)
      if (!v.warrantyMonths) risks.push(`${v.vendorName}: No warranty specified`)
    })

    setQuickResult({
      vendors: analyzed,
      cheapest, bestBrand, bestQuality, bestCompliance, recommended, risks,
      savings: analyzed.length >= 2 ? Math.round((Math.max(...analyzed.map(v => v.totalLanded)) - cheapest.totalLanded) * 100) / 100 : 0,
    })
  }

  const fmt = (v) => typeof v === 'number' ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : v || '—'

  // ─── QUICK COMPARE VIEW ──────────────────────────────
  if (view === 'quickCompare') return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8">
        <button onClick={() => { setView('projects'); setQuickResult(null) }} style={{ ...btnSecondary, padding: '10px 14px' }}><ChevronLeft size={18} /></button>
        <h2 style={{ color: 'var(--primary)', fontSize: '22px', fontWeight: 500 }} className="sm:text-3xl flex-1 min-w-0">Quick Compare</h2>
        {quickVendors.length < 5 && (
          <button onClick={() => setQuickVendors(prev => [...prev, emptyQuickVendor()])} style={btnSecondary} className="flex items-center gap-2 w-full sm:w-auto justify-center"><Plus size={18} /> Add Vendor</button>
        )}
      </div>

      {error && <div className="mb-5 px-4 py-3 text-sm" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px' }}>{error}</div>}

      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Upload up to 5 quotation PDFs/images and enter key details. We'll auto-compare on Price, Brand, and Material Quality.</p>

      {/* Vendor Cards */}
      <div className="space-y-6 mb-8">
        {quickVendors.map((v, vi) => (
          <div key={vi} style={cardStyle} className="card-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontWeight: 500, color: 'var(--primary)' }}>Vendor {String.fromCharCode(65 + vi)}</h3>
              {quickVendors.length > 2 && (
                <button onClick={() => setQuickVendors(prev => prev.filter((_, i) => i !== vi))} style={{ color: 'var(--destructive)' }}><Trash2 size={16} /></button>
              )}
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block cursor-pointer">
                <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center', background: v.fileName ? '#f0fdf4' : 'transparent' }}>
                  {v.fileName ? (
                    <p className="flex items-center justify-center gap-2 text-sm" style={{ color: '#15803d' }}><FileText size={18} /> {v.fileName}</p>
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}><Upload size={18} /> Upload Quotation (PDF / Image)</p>
                  )}
                </div>
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => {
                  const file = e.target.files[0]
                  if (file) updateQuickVendor(vi, 'file', file), updateQuickVendor(vi, 'fileName', file.name)
                }} />
              </label>
            </div>

            {/* Vendor Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              <input required placeholder="Vendor Name *" value={v.vendorName} onChange={e => updateQuickVendor(vi, 'vendorName', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <input placeholder="Company" value={v.company} onChange={e => updateQuickVendor(vi, 'company', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <input placeholder="GST Number" value={v.gstNumber} onChange={e => updateQuickVendor(vi, 'gstNumber', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <input type="number" step="0.01" placeholder="Total Amount (₹)" value={v.totalAmount || ''} onChange={e => updateQuickVendor(vi, 'totalAmount', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <select value={v.gstType} onChange={e => updateQuickVendor(vi, 'gstType', e.target.value)} style={{ ...selectStyle, fontSize: '13px', padding: '8px 12px' }}>
                <option value="exclusive">GST Exclusive</option>
                <option value="inclusive">GST Inclusive</option>
                <option value="not_mentioned">GST Not Mentioned</option>
              </select>
              <input type="number" placeholder="GST %" value={v.gstPercent} onChange={e => updateQuickVendor(vi, 'gstPercent', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <select value={v.brandQuality} onChange={e => updateQuickVendor(vi, 'brandQuality', e.target.value)} style={{ ...selectStyle, fontSize: '13px', padding: '8px 12px' }}>
                <option value="branded">Branded (Havells, Legrand...)</option>
                <option value="mixed">Mixed Brands</option>
                <option value="generic">Generic / Local</option>
              </select>
              <select value={v.materialGrade} onChange={e => updateQuickVendor(vi, 'materialGrade', e.target.value)} style={{ ...selectStyle, fontSize: '13px', padding: '8px 12px' }}>
                <option value="premium">Premium Grade</option>
                <option value="standard">Standard Grade</option>
                <option value="economy">Economy Grade</option>
              </select>
              <input placeholder="Payment Terms" value={v.paymentTerms} onChange={e => updateQuickVendor(vi, 'paymentTerms', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <input type="number" placeholder="Delivery (days)" value={v.deliveryDays || ''} onChange={e => updateQuickVendor(vi, 'deliveryDays', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              <input type="number" placeholder="Warranty (months)" value={v.warrantyMonths || ''} onChange={e => updateQuickVendor(vi, 'warrantyMonths', e.target.value)} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
            </div>

            {/* Line Items */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Line Items (optional — for detailed comparison)</p>
                <button onClick={() => addQuickItem(vi)} className="flex items-center gap-1 text-xs" style={{ color: 'var(--primary)', fontWeight: 500 }}><Plus size={13} /> Add Item</button>
              </div>
              {v.items.length > 0 && (
                <div className="space-y-2">
                  {v.items.map((it, ii) => (
                    <div key={ii} className="flex gap-2 items-center">
                      <input placeholder="Item *" value={it.description} onChange={e => updateQuickItem(vi, ii, 'description', e.target.value)} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', flex: 2 }} />
                      <input placeholder="Brand" value={it.brand} onChange={e => updateQuickItem(vi, ii, 'brand', e.target.value)} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', flex: 1 }} />
                      <input placeholder="Make/Quality" value={it.make} onChange={e => updateQuickItem(vi, ii, 'make', e.target.value)} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', flex: 1 }} />
                      <input placeholder="HSN" value={it.hsn} onChange={e => updateQuickItem(vi, ii, 'hsn', e.target.value)} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', width: '80px', flex: 'none' }} />
                      <input type="number" placeholder="Qty" value={it.qty} onChange={e => updateQuickItem(vi, ii, 'qty', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', width: '60px', flex: 'none' }} />
                      <input type="number" step="0.01" placeholder="Rate" value={it.rate || ''} onChange={e => updateQuickItem(vi, ii, 'rate', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', width: '90px', flex: 'none' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)', minWidth: '70px', textAlign: 'right' }}>{fmt(it.rate * it.qty)}</span>
                      <button onClick={() => removeQuickItem(vi, ii)} style={{ color: 'var(--destructive)', padding: '4px' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compare Button */}
      <button onClick={runQuickCompare} style={{ ...btnPrimary, width: '100%', padding: '14px', fontSize: '16px', borderRadius: '16px' }} className="flex items-center justify-center gap-2 mb-8 btn-ring">
        <Zap size={20} /> Compare & Find Best Quotation
      </button>

      {/* Quick Results */}
      {quickResult && (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickResult.vendors.map((v, i) => {
              const isWinner = v.vendorName === quickResult.recommended.vendorName
              return (
                <div key={i} style={{ ...cardStyle, border: isWinner ? '2px solid #15803d' : '1px solid var(--border)', position: 'relative' }} className="card-elevated">
                  {isWinner && <div style={{ position: 'absolute', top: '-10px', right: '16px', background: '#15803d', color: 'white', padding: '2px 12px', borderRadius: '24px', fontSize: '11px', fontWeight: 600 }}>BEST VALUE</div>}
                  <p style={{ fontWeight: 500, fontSize: '18px', color: 'var(--foreground)', marginBottom: '4px' }}>{v.vendorName}</p>
                  {v.company && <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{v.company}</p>}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Total Landed Cost</span><span style={{ fontWeight: 600, fontSize: '18px', color: isWinner ? '#15803d' : 'var(--primary)' }}>{fmt(v.totalLanded)}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>GST</span><span>{v.gstType} @ {v.gstPercent}% = {fmt(v.gstAmt)}</span></div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
                      <div className="flex justify-between mb-1"><span style={{ color: 'var(--text-muted)' }}>Overall Score</span><span style={{ fontWeight: 600, color: v.overallScore >= 70 ? '#15803d' : v.overallScore >= 50 ? '#a16207' : 'var(--destructive)' }}>{v.overallScore}/100</span></div>
                      <div style={{ background: 'var(--muted)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${v.overallScore}%`, height: '100%', borderRadius: '8px', background: v.overallScore >= 70 ? '#15803d' : v.overallScore >= 50 ? '#f59e0b' : 'var(--destructive)' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center" style={{ background: 'var(--muted)', borderRadius: '8px', padding: '6px' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Price</p>
                        <p className="text-xs font-medium">{v.vendorName === quickResult.cheapest.vendorName ? '🏆 Best' : `+${fmt(v.totalLanded - quickResult.cheapest.totalLanded)}`}</p>
                      </div>
                      <div className="text-center" style={{ background: 'var(--muted)', borderRadius: '8px', padding: '6px' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Brand</p>
                        <p className="text-xs font-medium">{v.brandScore}%</p>
                      </div>
                      <div className="text-center" style={{ background: 'var(--muted)', borderRadius: '8px', padding: '6px' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quality</p>
                        <p className="text-xs font-medium">{v.qualityScore}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Comparison Table */}
          <div style={cardStyle} className="card-elevated overflow-x-auto">
            <h3 className="mb-4" style={{ fontWeight: 500, fontSize: '18px' }}>Side-by-Side Comparison</h3>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Parameter</th>
                {quickResult.vendors.map((v, i) => <th key={i} className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{v.vendorName}</th>)}
              </tr></thead>
              <tbody>
                {[
                  { label: 'Base Amount', key: 'baseAmount', format: true },
                  { label: 'GST Type', key: 'gstType' },
                  { label: 'GST Amount', key: 'gstAmt', format: true },
                  { label: 'Total Landed Cost', key: 'totalLanded', format: true, bold: true },
                  { label: 'Brand Quality', key: 'brandQuality' },
                  { label: 'Material Grade', key: 'materialGrade' },
                  { label: 'Brand Score', key: 'brandScore', suffix: '%' },
                  { label: 'Quality Score', key: 'qualityScore', suffix: '%' },
                  { label: 'Compliance Score', key: 'complianceScore', suffix: '%' },
                  { label: 'Payment Terms', key: 'paymentTerms' },
                  { label: 'Delivery (days)', key: 'deliveryDays' },
                  { label: 'Warranty (months)', key: 'warrantyMonths' },
                  { label: 'GST Number', key: 'gstNumber' },
                  { label: 'Overall Score', key: 'overallScore', suffix: '/100', bold: true },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: row.bold ? 'var(--muted)' : 'transparent' }}>
                    <td className="px-4 py-2.5" style={{ fontWeight: row.bold ? 600 : 400 }}>{row.label}</td>
                    {quickResult.vendors.map((v, vi) => {
                      const val = v[row.key]
                      const isLowest = row.format && typeof val === 'number' && val === Math.min(...quickResult.vendors.map(x => x[row.key]))
                      return <td key={vi} className="px-4 py-2.5 text-right" style={{ fontWeight: row.bold ? 600 : 400, color: isLowest ? '#15803d' : row.key === 'gstNumber' && !val ? 'var(--destructive)' : 'var(--foreground)' }}>
                        {row.format ? fmt(val) : (val || 'Not Specified')}{row.suffix || ''}
                      </td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Executive Verdict */}
          <div style={{ ...cardStyle, border: '2px solid var(--primary)' }} className="card-elevated">
            <h3 className="mb-5 flex items-center gap-2" style={{ fontWeight: 500, fontSize: '20px', color: 'var(--primary)' }}><Trophy size={22} /> Executive Verdict</h3>
            <div className="overflow-x-auto mb-5" style={{ borderRadius: '12px', border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Metric','Winner','Reason'].map((h,i) => <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}><td className="px-4 py-2.5" style={{ fontWeight: 500 }}>Lowest Price</td><td className="px-4 py-2.5" style={{ color: '#15803d', fontWeight: 500 }}>{quickResult.cheapest.vendorName}</td><td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>₹{quickResult.savings.toLocaleString('en-IN')} cheaper than highest</td></tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}><td className="px-4 py-2.5" style={{ fontWeight: 500 }}>Best Brand</td><td className="px-4 py-2.5" style={{ color: '#15803d', fontWeight: 500 }}>{quickResult.bestBrand.vendorName}</td><td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>Brand score: {quickResult.bestBrand.brandScore}%</td></tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}><td className="px-4 py-2.5" style={{ fontWeight: 500 }}>Best Material Quality</td><td className="px-4 py-2.5" style={{ color: '#15803d', fontWeight: 500 }}>{quickResult.bestQuality.vendorName}</td><td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>Quality score: {quickResult.bestQuality.qualityScore}%</td></tr>
                  <tr><td className="px-4 py-2.5" style={{ fontWeight: 500 }}>Best Compliance</td><td className="px-4 py-2.5" style={{ color: '#15803d', fontWeight: 500 }}>{quickResult.bestCompliance.vendorName}</td><td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>Compliance score: {quickResult.bestCompliance.complianceScore}%</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mb-5 px-5 py-4" style={{ background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <p style={{ fontWeight: 500, color: '#15803d', fontSize: '18px', marginBottom: '4px' }}>Recommended: {quickResult.recommended.vendorName}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Overall score {quickResult.recommended.overallScore}/100 — Best balance of price ({fmt(quickResult.recommended.totalLanded)}),
                brand quality ({quickResult.recommended.brandScore}%), material grade ({quickResult.recommended.materialGrade}),
                and compliance ({quickResult.recommended.complianceScore}%).
              </p>
            </div>
            {quickResult.risks.length > 0 && (
              <div className="px-5 py-4" style={{ background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <p className="flex items-center gap-2 mb-2" style={{ fontWeight: 500, color: 'var(--destructive)' }}><AlertTriangle size={16} /> Risk Flags</p>
                <ul className="text-sm space-y-1" style={{ color: 'var(--destructive)' }}>
                  {quickResult.risks.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ─── VENDORS VIEW ────────────────────────────────────
  if (view === 'vendors') return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setView('projects')} style={{ ...btnSecondary, padding: '8px 12px' }}><ChevronLeft size={18} /></button>
        <h2 style={{ color: 'var(--primary)', fontSize: '28px', fontWeight: 500 }}>Vendors</h2>
        <div className="flex-1" />
        <button onClick={() => setShowNewVendor(true)} style={btnPrimary} className="flex items-center gap-2"><Plus size={18} /> Add Vendor</button>
      </div>
      {error && <div className="mb-5 px-4 py-3 text-sm" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px' }}>{error}</div>}
      {showNewVendor && (
        <div className="mb-8" style={cardStyle}>
          <div className="flex justify-between mb-4"><h3 style={{ fontWeight: 500 }}>New Vendor</h3><button onClick={() => setShowNewVendor(false)}><X size={18} /></button></div>
          <form onSubmit={handleCreateVendor} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required placeholder="Vendor Name *" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} style={inputStyle} />
            <input placeholder="Company" value={vendorForm.company} onChange={e => setVendorForm({ ...vendorForm, company: e.target.value })} style={inputStyle} />
            <input placeholder="Phone" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} style={inputStyle} />
            <input placeholder="Email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} style={inputStyle} />
            <input placeholder="GST Number" value={vendorForm.gst_number} onChange={e => setVendorForm({ ...vendorForm, gst_number: e.target.value })} style={inputStyle} />
            <input placeholder="Address" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} style={inputStyle} />
            <div className="sm:col-span-2"><button type="submit" style={btnPrimary}>Create Vendor</button></div>
          </form>
        </div>
      )}
      <div className="space-y-3">
        {vendors.map(v => (
          <div key={v.id} style={cardStyle} className="flex items-center gap-4">
            <div className="flex-1">
              <p style={{ fontWeight: 500, color: 'var(--foreground)' }}>{v.name}{v.company ? ` — ${v.company}` : ''}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {v.gst_number ? `GST: ${v.gst_number}` : 'GST: Missing'} &bull; {v.quote_count || 0} quotes
                {v.phone ? ` • ${v.phone}` : ''}
              </p>
            </div>
            {v.rating > 0 && <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < v.rating ? '#f59e0b' : 'none'} color={i < v.rating ? '#f59e0b' : 'var(--border)'} />)}</div>}
          </div>
        ))}
        {vendors.length === 0 && <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No vendors yet.</p>}
      </div>
    </div>
  )

  // ─── PROJECT DETAIL VIEW ─────────────────────────────
  if (view === 'detail' && activeProject) return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <button onClick={() => { setView('projects'); setComparison(null) }} style={{ ...btnSecondary, padding: '8px 12px' }}><ChevronLeft size={18} /></button>
        <h2 style={{ color: 'var(--primary)', fontSize: '28px', fontWeight: 500 }}>{activeProject.title}</h2>
        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '24px', fontSize: '12px', fontWeight: 500, ...(statusColors[activeProject.status] || statusColors.draft) }}>{activeProject.status}</span>
        <div className="flex-1" />
        <button onClick={() => setShowNewQuote(true)} style={btnPrimary} className="flex items-center gap-2"><Plus size={18} /> Add Quote</button>
      </div>

      {error && <div className="mb-5 px-4 py-3 text-sm" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px' }}>{error}</div>}

      {/* New Quote Form */}
      {showNewQuote && (
        <div className="mb-8" style={cardStyle}>
          <div className="flex justify-between mb-4"><h3 style={{ fontWeight: 500 }}>Add Vendor Quote</h3><button onClick={() => setShowNewQuote(false)}><X size={18} /></button></div>
          <form onSubmit={handleCreateQuote} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <select required value={quoteForm.vendor_id} onChange={e => setQuoteForm({ ...quoteForm, vendor_id: e.target.value })} style={selectStyle}>
              <option value="">Select Vendor *</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>)}
            </select>
            <select value={quoteForm.gst_type} onChange={e => setQuoteForm({ ...quoteForm, gst_type: e.target.value })} style={selectStyle}>
              <option value="exclusive">GST Exclusive</option>
              <option value="inclusive">GST Inclusive</option>
              <option value="not_mentioned">GST Not Mentioned</option>
            </select>
            <input type="number" step="0.01" placeholder="GST %" value={quoteForm.gst_percent} onChange={e => setQuoteForm({ ...quoteForm, gst_percent: parseFloat(e.target.value) || 0 })} style={inputStyle} />
            <input type="number" step="0.01" placeholder="Logistics Cost" value={quoteForm.logistics_cost} onChange={e => setQuoteForm({ ...quoteForm, logistics_cost: parseFloat(e.target.value) || 0 })} style={inputStyle} />
            <input type="number" step="0.01" placeholder="Installation Cost" value={quoteForm.installation_cost} onChange={e => setQuoteForm({ ...quoteForm, installation_cost: parseFloat(e.target.value) || 0 })} style={inputStyle} />
            <input type="number" step="0.01" placeholder="Other Charges" value={quoteForm.other_charges} onChange={e => setQuoteForm({ ...quoteForm, other_charges: parseFloat(e.target.value) || 0 })} style={inputStyle} />
            <input placeholder="Payment Terms" value={quoteForm.payment_terms} onChange={e => setQuoteForm({ ...quoteForm, payment_terms: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Delivery (days)" value={quoteForm.delivery_days} onChange={e => setQuoteForm({ ...quoteForm, delivery_days: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Warranty (months)" value={quoteForm.warranty_months} onChange={e => setQuoteForm({ ...quoteForm, warranty_months: e.target.value })} style={inputStyle} />
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Upload Quotation (PDF/Image)</label>
              <input type="file" accept=".pdf,image/*" onChange={e => setQuoteFile(e.target.files[0])} className="text-sm" />
            </div>
            <textarea placeholder="Notes" value={quoteForm.notes} onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: '60px' }} />
            <div className="sm:col-span-2 lg:col-span-3"><button type="submit" style={btnPrimary}>Add Quote</button></div>
          </form>
        </div>
      )}

      {/* Quote Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {quotes.map(q => (
          <div key={q.id} style={cardStyle} className="card-elevated">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p style={{ fontWeight: 500, fontSize: '16px', color: 'var(--foreground)' }}>{q.vendor_name}</p>
                {q.vendor_company && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.vendor_company}</p>}
              </div>
              <button onClick={() => handleDeleteQuote(q.id)} className="p-1.5" style={{ borderRadius: '8px', color: 'var(--destructive)' }}><Trash2 size={14} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Net Amount</span><span style={{ fontWeight: 500 }}>{fmt(q.net_amount)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>GST ({q.gst_type})</span><span>{fmt(q.gst_amount)}</span></div>
              <div className="flex justify-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <span style={{ fontWeight: 500, color: 'var(--primary)' }}>Total Landed</span>
                <span style={{ fontWeight: 500, color: 'var(--primary)', fontSize: '16px' }}>{fmt(q.total_landed_cost)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => openItems(q.id)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: '12px' }} className="flex items-center gap-1">
                <Package size={13} /> {q.item_count || 0} Items
              </button>
              {q.file_path && <a href={`/uploads/${q.file_path}`} target="_blank" style={{ ...btnSecondary, padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }} className="flex items-center gap-1"><FileText size={13} /> File</a>}
            </div>
          </div>
        ))}
        {quotes.length === 0 && <p className="col-span-full text-center py-12" style={{ color: 'var(--text-muted)' }}>No quotes added yet.</p>}
      </div>

      {/* Line Items Editor */}
      {showItems && (
        <div className="mb-8" style={cardStyle}>
          <div className="flex justify-between mb-4">
            <h3 style={{ fontWeight: 500 }}>Line Items — {quotes.find(q => q.id === showItems)?.vendor_name}</h3>
            <button onClick={() => setShowItems(null)}><X size={18} /></button>
          </div>
          {/* Items table */}
          {items.length > 0 && (
            <div className="overflow-x-auto mb-4" style={{ borderRadius: '12px', border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Description','Spec','Brand','HSN','Qty','Unit','Gross Rate','Disc%','Net Rate','Total',''].map((h,i) => (
                    <th key={i} className="px-3 py-2 text-xs font-medium text-left uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{items.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-2" style={{ fontWeight: 500 }}>{it.item_description}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{it.specification || '—'}</td>
                    <td className="px-3 py-2" style={{ color: it.brand ? 'var(--foreground)' : 'var(--destructive)' }}>{it.brand || 'Generic'}</td>
                    <td className="px-3 py-2" style={{ color: it.hsn_code ? 'var(--foreground)' : 'var(--destructive)' }}>{it.hsn_code || 'Missing'}</td>
                    <td className="px-3 py-2">{it.quantity}</td>
                    <td className="px-3 py-2">{it.unit}</td>
                    <td className="px-3 py-2">{fmt(it.gross_rate)}</td>
                    <td className="px-3 py-2">{it.discount_percent}%</td>
                    <td className="px-3 py-2">{fmt(it.net_rate)}</td>
                    <td className="px-3 py-2" style={{ fontWeight: 500 }}>{fmt(it.line_total)}</td>
                    <td className="px-3 py-2"><button onClick={() => handleDeleteItem(it.id)} style={{ color: 'var(--destructive)' }}><Trash2 size={13} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {/* Add item form */}
          <form onSubmit={handleAddItem} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <input required placeholder="Description *" value={itemForm.item_description} onChange={e => setItemForm({ ...itemForm, item_description: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input placeholder="Specification" value={itemForm.specification} onChange={e => setItemForm({ ...itemForm, specification: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input placeholder="Brand" value={itemForm.brand} onChange={e => setItemForm({ ...itemForm, brand: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input placeholder="HSN Code" value={itemForm.hsn_code} onChange={e => setItemForm({ ...itemForm, hsn_code: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input type="number" step="0.01" placeholder="Qty" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input placeholder="Unit" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input type="number" step="0.01" placeholder="Gross Rate *" value={itemForm.gross_rate} onChange={e => setItemForm({ ...itemForm, gross_rate: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <input type="number" step="0.01" placeholder="Discount %" value={itemForm.discount_percent} onChange={e => setItemForm({ ...itemForm, discount_percent: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} />
            <button type="submit" style={{ ...btnPrimary, padding: '8px 16px', fontSize: '13px' }} className="flex items-center gap-1"><Plus size={14} /> Add Item</button>
          </form>
        </div>
      )}

      {/* Action buttons */}
      {quotes.length >= 2 && (
        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={loadComparison} style={btnPrimary} className="flex items-center gap-2"><BarChart3 size={18} /> Compare Quotes</button>
          <a href={exportComparisonCSV(activeProject.id)} download style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Download size={18} /> Export CSV</a>
          {activeProject.status !== 'approved' && (
            <>
              <button onClick={() => { setShowApproval('approve'); setApprovalForm({ vendor_id: '', notes: '' }) }} className="flex items-center gap-2" style={{ ...btnPrimary, background: '#15803d' }}><Check size={18} /> Approve</button>
              <button onClick={() => { setShowApproval('reject'); setApprovalForm({ vendor_id: '', notes: '' }) }} className="flex items-center gap-2" style={{ ...btnPrimary, background: 'var(--destructive)' }}><XCircle size={18} /> Reject</button>
            </>
          )}
        </div>
      )}

      {/* Approval Modal */}
      {showApproval && (
        <div className="mb-8" style={{ ...cardStyle, border: showApproval === 'approve' ? '2px solid #15803d' : '2px solid var(--destructive)' }}>
          <h3 className="mb-4" style={{ fontWeight: 500 }}>{showApproval === 'approve' ? 'Approve Project' : 'Reject Project'}</h3>
          {showApproval === 'approve' && (
            <select value={approvalForm.vendor_id} onChange={e => setApprovalForm({ ...approvalForm, vendor_id: e.target.value })} style={{ ...selectStyle, marginBottom: '12px' }}>
              <option value="">Select Winning Vendor *</option>
              {quotes.map(q => <option key={q.id} value={q.vendor_id}>{q.vendor_name} — {fmt(q.total_landed_cost)}</option>)}
            </select>
          )}
          <textarea placeholder="Notes" value={approvalForm.notes} onChange={e => setApprovalForm({ ...approvalForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: '60px', marginBottom: '12px' }} />
          <div className="flex gap-3">
            <button onClick={showApproval === 'approve' ? handleApprove : handleReject} style={showApproval === 'approve' ? { ...btnPrimary, background: '#15803d' } : { ...btnPrimary, background: 'var(--destructive)' }}>
              {showApproval === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
            <button onClick={() => setShowApproval(null)} style={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {comparison && (
        <div className="space-y-8">
          {/* Pricing */}
          <div style={cardStyle} className="card-elevated overflow-x-auto">
            <h3 className="mb-4" style={{ fontWeight: 500, fontSize: '18px' }}>Pricing Comparison</h3>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Metric</th>
                {comparison.vendors.map(v => <th key={v.id} className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{v.vendor_name}</th>)}
              </tr></thead>
              <tbody>{comparison.pricing.map((row, i) => {
                const vals = comparison.vendors.map(v => row.values[v.id])
                const numVals = vals.filter(v => typeof v === 'number')
                const minVal = numVals.length > 0 ? Math.min(...numVals) : null
                const isTotal = row.key === 'total_landed_cost'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: isTotal ? 'var(--muted)' : 'transparent' }}>
                    <td className="px-4 py-3" style={{ fontWeight: isTotal ? 600 : 400, color: isTotal ? 'var(--primary)' : 'var(--foreground)' }}>{row.label}</td>
                    {comparison.vendors.map(v => {
                      const val = row.values[v.id]
                      const isBest = typeof val === 'number' && val === minVal && numVals.length > 1 && row.key !== 'gst_percent'
                      return <td key={v.id} className="px-4 py-3 text-right" style={{ fontWeight: isTotal ? 600 : 400, color: isBest ? '#15803d' : isTotal ? 'var(--primary)' : 'var(--foreground)' }}>
                        {typeof val === 'number' ? (row.key.includes('percent') ? `${val}%` : fmt(val)) : (val || '—')}
                      </td>
                    })}
                  </tr>
                )
              })}</tbody>
            </table>
          </div>

          {/* Line Items */}
          <div style={cardStyle} className="card-elevated overflow-x-auto">
            <h3 className="mb-4" style={{ fontWeight: 500, fontSize: '18px' }}>Item Comparison</h3>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Item</th>
                {comparison.vendors.map(v => <th key={v.id} className="px-4 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{v.vendor_name} (Rate / Total)</th>)}
              </tr></thead>
              <tbody>{comparison.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3" style={{ fontWeight: 500 }}>{item.description}</td>
                  {comparison.vendors.map(v => {
                    const vi = item.vendors[v.id]
                    return <td key={v.id} className="px-4 py-3 text-right">
                      {vi ? <span>{fmt(vi.net_rate)} / <span style={{ fontWeight: 500 }}>{fmt(vi.line_total)}</span></span>
                        : <span style={{ color: 'var(--destructive)', fontWeight: 500 }}>Not Quoted</span>}
                    </td>
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Brand Audit */}
          <div style={cardStyle} className="card-elevated overflow-x-auto">
            <h3 className="mb-4" style={{ fontWeight: 500, fontSize: '18px' }}>Brand / Quality Audit</h3>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Item</th>
                {comparison.vendors.map(v => <th key={v.id} className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{v.vendor_name}</th>)}
              </tr></thead>
              <tbody>{comparison.brands.map((b, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3" style={{ fontWeight: 500 }}>{b.description}</td>
                  {comparison.vendors.map(v => {
                    const brand = b.vendors[v.id]
                    const isRisk = brand === 'Not Specified' || brand === 'Not Quoted'
                    return <td key={v.id} className="px-4 py-3" style={{ color: isRisk ? 'var(--destructive)' : 'var(--foreground)' }}>{brand}</td>
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Commercial Terms */}
          <div style={cardStyle} className="card-elevated overflow-x-auto">
            <h3 className="mb-4" style={{ fontWeight: 500, fontSize: '18px' }}>Commercial Terms</h3>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Term</th>
                {comparison.vendors.map(v => <th key={v.id} className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{v.vendor_name}</th>)}
              </tr></thead>
              <tbody>{comparison.terms.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3" style={{ fontWeight: 500 }}>{t.label}</td>
                  {comparison.vendors.map(v => {
                    const val = t.values[v.id]
                    const isRisk = val === 'Missing' || val === 'Not Mentioned'
                    return <td key={v.id} className="px-4 py-3" style={{ color: isRisk ? 'var(--destructive)' : 'var(--foreground)' }}>{String(val)}</td>
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Executive Verdict */}
          <div style={{ ...cardStyle, border: '2px solid var(--primary)' }} className="card-elevated">
            <h3 className="mb-5 flex items-center gap-2" style={{ fontWeight: 500, fontSize: '20px', color: 'var(--primary)' }}><Trophy size={22} /> Executive Verdict</h3>
            <div className="overflow-x-auto mb-5" style={{ borderRadius: '12px', border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Metric','Winner','Reason'].map((h,i) => <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>{comparison.verdict.metrics.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3" style={{ fontWeight: 500 }}>{m.metric}</td>
                    <td className="px-4 py-3" style={{ color: '#15803d', fontWeight: 500 }}>{m.winner_name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{m.reason}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {comparison.verdict.winner?.name && (
              <div className="mb-5 px-5 py-4" style={{ background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontWeight: 500, color: '#15803d', fontSize: '16px', marginBottom: '4px' }}>Recommended: {comparison.verdict.winner.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{comparison.verdict.recommendation}</p>
              </div>
            )}
            {comparison.verdict.risk_flags.length > 0 && (
              <div className="px-5 py-4" style={{ background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <p className="flex items-center gap-2 mb-2" style={{ fontWeight: 500, color: 'var(--destructive)' }}><AlertTriangle size={16} /> Risk Flags</p>
                <ul className="text-sm space-y-1" style={{ color: 'var(--destructive)' }}>
                  {comparison.verdict.risk_flags.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ─── PROJECTS LIST VIEW (default) ────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h2 style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 500 }} className="sm:text-3xl">Quotation Comparison</h2>
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 sm:gap-3">
          <button onClick={() => { setView('quickCompare'); setQuickVendors([emptyQuickVendor(), emptyQuickVendor()]); setQuickResult(null) }} className="flex items-center justify-center gap-2" style={{ ...btnPrimary, background: 'var(--accent)', width: '100%' }}><Zap size={18} /> Quick Compare</button>
          <button onClick={() => setView('vendors')} style={{ ...btnSecondary, width: '100%' }} className="flex items-center justify-center gap-2"><Building2 size={18} /> Vendors</button>
          <button onClick={() => setShowNewProject(true)} style={{ ...btnPrimary, width: '100%' }} className="flex items-center justify-center gap-2"><Plus size={18} /> New Project</button>
        </div>
      </div>

      {error && <div className="mb-5 px-4 py-3 text-sm" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px' }}>{error}</div>}

      {showNewProject && (
        <div className="mb-8" style={cardStyle}>
          <div className="flex justify-between mb-4"><h3 style={{ fontWeight: 500 }}>New Comparison Project</h3><button onClick={() => setShowNewProject(false)}><X size={18} /></button></div>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required placeholder="Project Title *" value={projForm.title} onChange={e => setProjForm({ ...projForm, title: e.target.value })} style={inputStyle} />
            <input placeholder="Description" value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} style={inputStyle} />
            <div className="sm:col-span-2"><button type="submit" style={btnPrimary}>Create Project</button></div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16" style={{ ...cardStyle }}>
          <BarChart3 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No comparison projects yet. Create one to start comparing vendor quotes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => (
            <div key={p.id} style={cardStyle} className="card-elevated flex items-center gap-4 cursor-pointer" onClick={() => openProject(p)}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p style={{ fontWeight: 500, fontSize: '16px', color: 'var(--foreground)' }}>{p.title}</p>
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '24px', fontSize: '11px', fontWeight: 500, ...(statusColors[p.status] || statusColors.draft) }}>{p.status}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {p.quote_count || 0} vendor quote{p.quote_count !== 1 ? 's' : ''}
                  {p.description ? ` — ${p.description}` : ''}
                  {p.approved_vendor_name ? ` • Approved: ${p.approved_vendor_name}` : ''}
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id) }} className="p-2" style={{ borderRadius: '8px', color: 'var(--destructive)' }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
