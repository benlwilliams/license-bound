import SunCalc from 'suncalc'
import { NIGHT_OFFSET_MINUTES } from '@/utils/constants'

const OFFSET_MS = NIGHT_OFFSET_MINUTES * 60 * 1000

/**
 * Returns the night window for a given date + location.
 * Night = 30 min after sunset → 30 min before next sunrise.
 * Handles sessions that span midnight.
 *
 * @param {string} dateStr 'YYYY-MM-DD' (session's local date)
 * @param {number} lat
 * @param {number} lng
 * @returns {{ nightStart: Date, nightEnd: Date }}
 */
export function getNightWindow(dateStr, lat, lng) {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Use noon (not midnight) so the Julian Day is unambiguously within the
  // correct solar day regardless of the device's UTC offset.
  const sessionDate = new Date(y, m - 1, d, 12, 0, 0)
  const nextDate = new Date(y, m - 1, d + 1, 12, 0, 0)

  const { sunset } = SunCalc.getTimes(sessionDate, lat, lng)
  const { sunrise } = SunCalc.getTimes(nextDate, lat, lng)

  return {
    nightStart: new Date(sunset.getTime() + OFFSET_MS),
    nightEnd: new Date(sunrise.getTime() - OFFSET_MS),
  }
}

/**
 * Calculates how many minutes of a drive fell during the night window.
 * Handles sessions that start before sunset but end after, and sessions
 * that cross midnight.
 *
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {number} lat
 * @param {number} lng
 * @param {number} startMs  Unix ms for drive start
 * @param {number} endMs    Unix ms for drive end
 * @returns {number} night minutes (may be 0)
 */
export function calcNightMinutes(dateStr, lat, lng, startMs, endMs) {
  if (!lat || !lng) return 0

  const { nightStart, nightEnd } = getNightWindow(dateStr, lat, lng)

  // Clamp the drive to the overlap with the night window
  const overlapStart = Math.max(startMs, nightStart.getTime())
  const overlapEnd = Math.min(endMs, nightEnd.getTime())

  if (overlapEnd <= overlapStart) return 0
  return Math.round((overlapEnd - overlapStart) / 60000)
}

/**
 * For a manual entry without GPS, returns a night window for a date + city
 * using a geocoordinate lookup table of major Texas cities.
 * Falls back to Austin coordinates if city not found.
 */
const TX_CITY_COORDS = {
  'austin': [30.2672, -97.7431],
  'houston': [29.7604, -95.3698],
  'dallas': [32.7767, -96.7970],
  'san antonio': [29.4241, -98.4936],
  'fort worth': [32.7555, -97.3308],
  'el paso': [31.7619, -106.4850],
  'arlington': [32.7357, -97.1081],
  'corpus christi': [27.8006, -97.3964],
  'plano': [33.0198, -96.6989],
  'lubbock': [33.5779, -101.8552],
  'laredo': [27.5306, -99.4803],
  'garland': [32.9126, -96.6389],
  'irving': [32.8141, -96.9489],
  'amarillo': [35.2220, -101.8313],
  'grand prairie': [32.7459, -97.0202],
  'brownsville': [25.9017, -97.4975],
  'mckinney': [33.1972, -96.6398],
  'frisco': [33.1507, -96.8236],
  'pasadena': [29.6911, -95.2091],
  'killeen': [31.1171, -97.7278],
  'waco': [31.5493, -97.1467],
  'denton': [33.2148, -97.1331],
  'midland': [31.9974, -102.0779],
  'odessa': [31.8457, -102.3676],
  'abilene': [32.4487, -99.7331],
  'beaumont': [30.0860, -94.1018],
  'round rock': [30.5083, -97.6789],
}

export function getCoordsForCity(cityName) {
  const key = (cityName || '').toLowerCase().trim()
  return TX_CITY_COORDS[key] ?? [30.2672, -97.7431] // default Austin
}
