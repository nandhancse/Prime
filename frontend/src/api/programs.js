import api from './axios.js'


export async function getPrograms() {
  const response = await api.get('programs/')
  return response.data
}

export async function getProgram(id) {
  const response = await api.get(`programs/${id}/`)
  return response.data
}

export async function createProgram(data) {
  const response = await api.post('programs/', data)
  return response.data
}

export async function updateProgram(id, data) {
  const response = await api.put(`programs/${id}/`, data)
  return response.data
}

export async function deleteProgram(id) {
  await api.delete(`programs/${id}/`)
}

export async function activateProgram(id) {
  const response = await api.post(`programs/${id}/activate/`)
  return response.data
}
