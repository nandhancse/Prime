import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'


function NativeBackHandler() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined
    let listener

    CapacitorApp.addListener('backButton', () => {
      const event = new Event('prime:native-back', { cancelable: true })
      if (!window.dispatchEvent(event)) return

      if (location.pathname.startsWith('/workout/')) {
        navigate('/dashboard')
      } else if (location.pathname === '/' || location.pathname === '/dashboard') {
        CapacitorApp.minimizeApp()
      } else {
        navigate(-1)
      }
    }).then((handle) => { listener = handle })

    return () => listener?.remove()
  }, [location.pathname, navigate])

  return null
}

export default NativeBackHandler
