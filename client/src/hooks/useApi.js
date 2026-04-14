const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// Contractors
export const getContractors = () => request('/contractors')
export const createContractor = (data) =>
  request('/contractors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
export const updateContractor = (id, data) =>
  request(`/contractors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
export const deleteContractor = (id) =>
  request(`/contractors/${id}`, { method: 'DELETE' })

// Laborers
export const getLaborers = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/laborers${qs ? '?' + qs : ''}`)
}
export const createLaborer = (formData) =>
  fetch(`${BASE}/laborers`, { method: 'POST', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const updateLaborer = (id, formData) =>
  fetch(`${BASE}/laborers/${id}`, { method: 'PUT', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const reEnrollFace = (id, formData) =>
  fetch(`${BASE}/laborers/${id}/re-enroll`, { method: 'POST', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const updateLaborerStatus = (id, status) => {
  const fd = new FormData()
  fd.append('status', status)
  return fetch(`${BASE}/laborers/${id}/status`, { method: 'PATCH', body: fd }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
}

// Attendance
export const uploadGroupPhoto = (formData) =>
  fetch(`${BASE}/attendance/upload`, { method: 'POST', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const confirmAttendance = (formData) =>
  fetch(`${BASE}/attendance/confirm`, { method: 'POST', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const getAttendance = (date) =>
  request(`/attendance${date ? '?date=' + date : ''}`)
export const getAttendanceRange = (start, end, contractorId) => {
  const params = new URLSearchParams({ start, end })
  if (contractorId) params.append('contractor_id', contractorId)
  return request(`/attendance/range?${params}`)
}

// Quotation Vendors
export const getVendors = () => request('/quotations/vendors')
export const createVendor = (data) =>
  request('/quotations/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
export const updateVendor = (id, data) =>
  request(`/quotations/vendors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

// Quotation Projects
export const getProjects = () => request('/quotations/projects')
export const createProject = (data) =>
  request('/quotations/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
export const updateProject = (id, data) =>
  request(`/quotations/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
export const deleteProject = (id) =>
  request(`/quotations/projects/${id}`, { method: 'DELETE' })
export const approveProject = (id, data) =>
  request(`/quotations/projects/${id}/approve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
export const rejectProject = (id, data) =>
  request(`/quotations/projects/${id}/reject`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

// Quotation Quotes
export const getQuotes = (projectId) => request(`/quotations/projects/${projectId}/quotes`)
export const createQuote = (projectId, formData) =>
  fetch(`${BASE}/quotations/projects/${projectId}/quotes`, { method: 'POST', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const updateQuote = (quoteId, formData) =>
  fetch(`${BASE}/quotations/quotes/${quoteId}`, { method: 'PUT', body: formData }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
export const deleteQuote = (quoteId) =>
  request(`/quotations/quotes/${quoteId}`, { method: 'DELETE' })

// Quotation Line Items
export const getQuoteItems = (quoteId) => request(`/quotations/quotes/${quoteId}/items`)
export const createQuoteItem = (quoteId, data) =>
  request(`/quotations/quotes/${quoteId}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
export const updateQuoteItem = (itemId, data) =>
  request(`/quotations/items/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
export const deleteQuoteItem = (itemId) =>
  request(`/quotations/items/${itemId}`, { method: 'DELETE' })

// Quotation Comparison
export const getComparison = (projectId) => request(`/quotations/projects/${projectId}/compare`)
export const exportComparisonCSV = (projectId) => `${BASE}/quotations/projects/${projectId}/export-pdf`

// Reports
export const exportCSV = (start, end, contractorId) => {
  const params = new URLSearchParams({ start, end })
  if (contractorId) params.append('contractor_id', contractorId)
  return `${BASE}/reports/export?${params}`
}
