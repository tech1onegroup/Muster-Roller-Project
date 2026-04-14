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
export const updateAttendance = (id, patch) => {
  const fd = new FormData()
  Object.entries(patch).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') fd.append(k, v)
  })
  return fetch(`${BASE}/attendance/${id}`, { method: 'PATCH', body: fd }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
    return res.json()
  })
}

// Reports
export const exportCSV = (start, end, contractorId) => {
  const params = new URLSearchParams({ start, end })
  if (contractorId) params.append('contractor_id', contractorId)
  return `${BASE}/reports/export?${params}`
}
