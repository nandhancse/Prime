import axios from 'axios'


const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/'

export const API_BASE_URL = `${configuredBaseUrl.replace(/\/+$/, '')}/`
export const ACCESS_TOKEN_KEY = 'prime_access_token'
export const REFRESH_TOKEN_KEY = 'prime_refresh_token'
export const AUTH_LOGOUT_EVENT = 'prime:auth-logout'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

let refreshRequest = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const isPublicAuthRequest = [
      'auth/login/',
      'auth/register/',
      'auth/google/',
      'auth/token/refresh/',
    ].some((path) => originalRequest?.url?.includes(path))

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      !refreshToken ||
      isPublicAuthRequest
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshRequest) {
        refreshRequest = axios
          .post(`${API_BASE_URL}auth/token/refresh/`, { refresh: refreshToken })
          .finally(() => {
            refreshRequest = null
          })
      }

      const response = await refreshRequest
      const newAccessToken = response.data.access
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
      return Promise.reject(refreshError)
    }
  },
)

export default api
