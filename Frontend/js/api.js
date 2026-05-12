async function apifetch(url, options = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
  return data
}

export const api = {
  get:  (url) => apifetch(url),
  post: (url, body) => apifetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  postForm: (url, formData) => apifetch(url, { method: 'POST', body: formData }),
  put:  (url, body) => apifetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  patch: (url) => apifetch(url, { method: 'PATCH' }),
}

export const consultApi = {
  getRecent:   ()        => api.get('/api/v1/consultations/recent'),
  getById:     (id)      => api.get(`/api/v1/consultations/${id}`),
  sendMessage: (id, msg) => api.post(`/api/v1/consultations/${id}/message`, { message: msg }),
  archive:     (id)      => api.patch(`/api/v1/consultations/${id}/archive`),
  create(symptoms, desc, imageFile) {
    const form = new FormData()
    form.append('symptoms', symptoms)
    form.append('symptomsDescription', desc)
    if (imageFile) form.append('file', imageFile)
    return api.postForm('/api/v1/consultations', form)
  },
}
