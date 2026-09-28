import { Capacitor, registerPlugin } from '@capacitor/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrors } from '../api/errors.js'
import { useAuth } from '../context/useAuth.js'


const GoogleAuth = registerPlugin('GoogleAuth')
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
let scriptPromise
let activeCredentialHandler
let initializedClientId

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Google login could not be loaded.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

function GoogleLoginButton({ onError }) {
  const containerRef = useRef(null)
  const onErrorRef = useRef(onError)
  const [busy, setBusy] = useState(false)
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const native = Capacitor.isNativePlatform()
  onErrorRef.current = onError

  const finishLogin = useCallback(async (credential) => {
    setBusy(true)
    onErrorRef.current('')
    try {
      await loginWithGoogle(credential)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      onErrorRef.current(getApiErrors(error, 'Google login failed. Please try again.').form)
    } finally {
      setBusy(false)
    }
  }, [loginWithGoogle, navigate])

  useEffect(() => {
    if (native || !clientId || !containerRef.current) return undefined
    let active = true
    const handler = (response) => {
      if (active && response.credential) finishLogin(response.credential)
    }
    activeCredentialHandler = handler

    loadGoogleIdentityServices()
      .then(() => {
        if (!active) return
        if (initializedClientId !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => activeCredentialHandler?.(response),
          })
          initializedClientId = clientId
        }
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(containerRef.current.clientWidth, 360),
        })
      })
      .catch((error) => active && onErrorRef.current(error.message))

    return () => {
      active = false
      if (activeCredentialHandler === handler) activeCredentialHandler = undefined
    }
  }, [finishLogin, native])

  async function startNativeLogin() {
    if (!clientId) return
    setBusy(true)
    onErrorRef.current('')
    try {
      const result = await GoogleAuth.signIn({ serverClientId: clientId })
      await finishLogin(result.credential)
    } catch (error) {
      onErrorRef.current(error?.message || 'Google login was cancelled or unavailable.')
      setBusy(false)
    }
  }

  if (!clientId) {
    return <button className="google-native-button" type="button" disabled>Continue with Google</button>
  }

  if (native) {
    return <button className="google-native-button" type="button" onClick={startNativeLogin} disabled={busy}>{busy ? 'Connecting...' : 'Continue with Google'}</button>
  }

  return <div className="google-button-container" ref={containerRef} aria-label="Continue with Google" />
}

export default GoogleLoginButton
