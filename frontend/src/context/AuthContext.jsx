import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ACCESS_TOKEN_KEY,
  AUTH_LOGOUT_EVENT,
  REFRESH_TOKEN_KEY,
} from '../api/axios.js'
import {
  getProfile,
  loginAccount,
  loginWithGoogleAccount,
  registerAccount,
} from '../api/auth.js'
import AuthContext from './authContext.js'


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setUser(null)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [clearSession, navigate])

  useEffect(() => {
    function handleExpiredSession() {
      logout()
    }

    window.addEventListener(AUTH_LOGOUT_EVENT, handleExpiredSession)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleExpiredSession)
  }, [logout])

  useEffect(() => {
    let isActive = true
    const hasToken = Boolean(
      localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY),
    )

    if (!hasToken) {
      setLoading(false)
      return undefined
    }

    async function loadCurrentUser() {
      try {
        const profile = await getProfile()
        if (isActive) {
          setUser(profile)
        }
      } catch {
        if (isActive) {
          clearSession()
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isActive = false
    }
  }, [clearSession])

  const establishSession = useCallback(async (response) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.access)
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh)
    try {
      const profile = await getProfile()
      setUser(profile)
      return profile
    } catch (error) {
      clearSession()
      throw error
    }
  }, [clearSession])

  const login = useCallback(async (credentials) => {
    return establishSession(await loginAccount(credentials))
  }, [establishSession])

  const loginWithGoogle = useCallback(async (credential) => {
    return establishSession(await loginWithGoogleAccount(credential))
  }, [establishSession])

  const register = useCallback(async (accountData) => {
    return establishSession(await registerAccount(accountData))
  }, [establishSession])

  const updateUser = useCallback((profile) => {
    setUser(profile)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      isAuthenticated: Boolean(user),
    }),
    [loading, login, loginWithGoogle, logout, register, updateUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
