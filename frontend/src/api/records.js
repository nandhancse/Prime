import api from './axios.js'


export async function getPersonalRecords(params = {}) {
  const response = await api.get('records/', { params })
  return response.data
}
