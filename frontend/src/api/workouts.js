import api from './axios.js'


export async function getWorkoutHistory(params = {}) {
  const response = await api.get('workouts/', { params })
  return response.data
}

export async function getWorkout(id) {
  const response = await api.get(`workouts/${id}/`)
  return response.data
}

export async function getActiveWorkout() {
  const response = await api.get('workouts/active/')
  return response.data
}

export async function startWorkout(programDayId) {
  const response = await api.post('workouts/start/', {
    program_day_id: programDayId,
  })
  return response.data
}

export async function updateWorkoutSet(id, data) {
  const response = await api.patch(`workouts/sets/${id}/`, data)
  return response.data
}

export async function addWorkoutSet(exerciseId, data = {}) {
  const response = await api.post(`workouts/exercises/${exerciseId}/sets/`, data)
  return response.data
}

export async function removeWorkoutSet(id) {
  await api.delete(`workouts/sets/${id}/`)
}

export async function completeWorkout(id, data = {}) {
  const response = await api.post(`workouts/${id}/complete/`, data)
  return response.data
}

export async function cancelWorkout(id) {
  const response = await api.post(`workouts/${id}/cancel/`)
  return response.data
}
