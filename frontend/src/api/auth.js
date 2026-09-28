import api from './axios.js'


export async function registerAccount(data) {
  const response = await api.post('auth/register/', data)
  return response.data
}

export async function loginAccount(data) {
  const response = await api.post('auth/login/', data)
  return response.data
}

export async function loginWithGoogleAccount(credential) {
  const response = await api.post('auth/google/', { credential })
  return response.data
}

export async function getProfile() {
  const response = await api.get('auth/profile/')
  return response.data
}

export async function updateProfile(data) {
  const response = await api.patch('auth/profile/', data)
  return response.data
}
