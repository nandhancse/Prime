import api from './axios.js'


export async function getExercises(params = {}) {
  const response = await api.get('exercises/', { params })
  return response.data
}

export async function getMuscleGroups() {
  const response = await api.get('exercises/muscle-groups/')
  return response.data
}

export async function getEquipment() {
  const response = await api.get('exercises/equipment/')
  return response.data
}

export async function createExercise(data) {
  const response = await api.post('exercises/', data)
  return response.data
}

export async function updateExercise(id, data) {
  const response = await api.patch(`exercises/${id}/`, data)
  return response.data
}

export async function deleteExercise(id) {
  await api.delete(`exercises/${id}/`)
}
