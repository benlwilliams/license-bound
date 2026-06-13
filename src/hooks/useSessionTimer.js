import { useState, useEffect, useRef } from 'react'

/**
 * Returns elapsed milliseconds since startTime (a Date or ms value).
 * Ticks every second while running.
 */
export function useSessionTimer(startTime, running = true, initialElapsed = 0) {
  const [elapsed, setElapsed] = useState(initialElapsed)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!startTime || !running) return

    const tick = () => {
      setElapsed(Date.now() - new Date(startTime).getTime())
    }

    tick() // immediate first tick
    intervalRef.current = setInterval(tick, 1000)

    return () => clearInterval(intervalRef.current)
  }, [startTime, running])

  return elapsed
}
