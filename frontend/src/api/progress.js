import api from './axios.js'


export async function getMeasurements(params = {}) {
  const response = await api.get('progress/measurements/', { params })
  return response.data
}

export async function createMeasurement(data) {
  const response = await api.post('progress/measurements/', data)
  return response.data
}

export async function updateMeasurement(id, data) {
  const response = await api.patch(`progress/measurements/${id}/`, data)
  return response.data
}

export async function deleteMeasurement(id) {
  await api.delete(`progress/measurements/${id}/`)
}
