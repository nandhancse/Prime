import { ChevronDown, ChevronUp, Pause, Play, SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'


function RestTimer({ duration, timerKey, onSkip }) {
  const [remaining, setRemaining] = useState(duration)
  const [paused, setPaused] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const sounded = useRef(false)

  useEffect(() => {
    setRemaining(duration)
    setPaused(false)
    setMinimized(false)
    sounded.current = false
  }, [duration, timerKey])

  useEffect(() => {
    if (paused || remaining <= 0) return undefined
    const interval = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [paused, remaining])

  useEffect(() => {
    if (remaining !== 0 || sounded.current) return
    sounded.current = true
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = new AudioContext()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.frequency.value = 740
      gain.gain.setValueAtTime(0.06, context.currentTime)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.16)
      oscillator.onended = () => context.close()
    } catch {
      // Audio is optional and may be blocked by browser policy.
    }
  }, [remaining])

  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, '0')

  return (
    <aside className={`rest-timer${minimized ? ' minimized' : ''}`} aria-live="polite">
      <button className="rest-timer-main" type="button" onClick={() => setMinimized((value) => !value)}>
        <span>{remaining === 0 ? 'Rest done' : 'Rest'}</span>
        <strong>{minutes}:{seconds}</strong>
        {minimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {!minimized && <div className="rest-timer-actions">
        <button type="button" onClick={() => setRemaining((value) => value + 15)}>+15</button>
        <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? <Play size={17} /> : <Pause size={17} />}{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" onClick={onSkip}><SkipForward size={17} />Skip</button>
      </div>}
    </aside>
  )
}

export default RestTimer
