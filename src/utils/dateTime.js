import { DRIVE_WINDOW_START_HOUR, DRIVE_WINDOW_END_HOUR } from './constants'

/** Returns 'YYYY-MM-DD' for a given Date (or today if omitted) */
export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/** Parses a 'YYYY-MM-DD' string into a local-midnight Date */
export function parseDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format milliseconds as H:MM:SS */
export function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format total minutes as "Xh Ym" */
export function formatMinutes(minutes) {
  if (minutes < 1) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Format minutes as decimal hours rounded to one place */
export function minutesToHours(minutes) {
  return (minutes / 60).toFixed(1)
}

/** Format a Date as "Mon Jun 6, 2026" */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** Format a Date as "9:34 AM" */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/** Format a date as "Jun 6" */
export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

/**
 * Returns true if the given Date falls within the teen driving window:
 * 5:00 AM to 11:00 PM.
 */
export function isInDrivingWindow(date) {
  const d = new Date(date)
  const hour = d.getHours()
  return hour >= DRIVE_WINDOW_START_HOUR && hour < DRIVE_WINDOW_END_HOUR
}

/** Add N calendar days to a Date, return new Date */
export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** How many calendar days between two dates (positive if b > a) */
export function daysBetween(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((new Date(b) - new Date(a)) / msPerDay)
}
