import {
  LOG_TYPES,
  DL91B_OBSERVATION_TARGET,
  DL91B_INSTRUCTION_TARGET,
  THIRTY_HR_TARGET,
  THIRTY_HR_NIGHT_TARGET,
  MIN_CALENDAR_DAYS,
} from '@/utils/constants'
import { addDays, daysBetween } from '@/utils/dateTime'

/**
 * Computes progress across all three logs from an array of sessions.
 *
 * @param {object[]} sessions - all sessions for one driver
 * @returns {object} progress totals and metadata
 */
export function getProgress(sessions) {
  let dl91bObs = 0
  let dl91bInstr = 0
  let thirtyHr = 0
  let nightHrs = 0
  let firstSessionDate = null

  for (const s of sessions) {
    const counted = s.countedMinutes ?? s.totalMinutes ?? 0
    const night = s.nightMinutes ?? 0

    if (s.logType === LOG_TYPES.DL91B_OBSERVATION) {
      dl91bObs += counted
    } else if (s.logType === LOG_TYPES.DL91B_INSTRUCTION) {
      dl91bInstr += counted
    } else if (s.logType === LOG_TYPES.PRACTICE_30HR) {
      thirtyHr += counted
      nightHrs += night
    }

    if (!firstSessionDate || s.date < firstSessionDate) {
      firstSessionDate = s.date
    }
  }

  const earliestTestDate = firstSessionDate
    ? addDays(firstSessionDate, MIN_CALENDAR_DAYS)
    : null

  return {
    dl91bObs: Math.round(dl91bObs),
    dl91bInstr: Math.round(dl91bInstr),
    thirtyHr: Math.round(thirtyHr),
    nightHrs: Math.round(nightHrs),
    // Targets in minutes
    dl91bObsTarget: DL91B_OBSERVATION_TARGET,
    dl91bInstrTarget: DL91B_INSTRUCTION_TARGET,
    thirtyHrTarget: THIRTY_HR_TARGET,
    nightHrsTarget: THIRTY_HR_NIGHT_TARGET,
    // Progress as 0–1 fractions
    dl91bObsFrac: Math.min(1, dl91bObs / DL91B_OBSERVATION_TARGET),
    dl91bInstrFrac: Math.min(1, dl91bInstr / DL91B_INSTRUCTION_TARGET),
    thirtyHrFrac: Math.min(1, thirtyHr / THIRTY_HR_TARGET),
    nightHrsFrac: Math.min(1, nightHrs / THIRTY_HR_NIGHT_TARGET),
    firstSessionDate,
    earliestTestDate,
    isComplete: dl91bObs >= DL91B_OBSERVATION_TARGET
      && dl91bInstr >= DL91B_INSTRUCTION_TARGET
      && thirtyHr >= THIRTY_HR_TARGET
      && nightHrs >= THIRTY_HR_NIGHT_TARGET,
  }
}

/**
 * Projects when the driver will finish all hours based on their recent pace.
 * Uses the last 30 days of sessions to calculate an average daily rate.
 *
 * @param {object[]} sessions
 * @param {object} progress - result of getProgress()
 * @returns {{ projectedDate: Date|null, minutesPerDay: number }}
 */
export function getPaceProjection(sessions, progress) {
  if (sessions.length === 0) return { projectedDate: null, minutesPerDay: 0 }

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentSessions = sessions.filter(s => new Date(s.date) >= thirtyDaysAgo)
  const totalRecentMinutes = recentSessions.reduce(
    (acc, s) => acc + (s.countedMinutes ?? s.totalMinutes ?? 0), 0
  )
  const minutesPerDay = totalRecentMinutes / 30

  if (minutesPerDay === 0) return { projectedDate: null, minutesPerDay: 0 }

  // Remaining minutes across all logs
  const remainingDl91bObs = Math.max(0, progress.dl91bObsTarget - progress.dl91bObs)
  const remainingDl91bInstr = Math.max(0, progress.dl91bInstrTarget - progress.dl91bInstr)
  const remainingThirtyHr = Math.max(0, progress.thirtyHrTarget - progress.thirtyHr)
  const remainingNight = Math.max(0, progress.nightHrsTarget - progress.nightHrs)

  // Largest remaining requirement drives the date (simplified: use total remaining)
  const totalRemaining = remainingDl91bObs + remainingDl91bInstr + remainingThirtyHr
  const daysNeeded = Math.ceil(totalRemaining / minutesPerDay)

  // Projected date is the later of: pace-based completion OR 44-day minimum
  const paceDate = addDays(today, daysNeeded)
  const minDate = progress.earliestTestDate ?? paceDate

  const projectedDate = paceDate > minDate ? paceDate : minDate

  return { projectedDate, minutesPerDay: Math.round(minutesPerDay) }
}

/**
 * Returns how many minutes of a driver's sessions happened today per log type.
 * Used to render the daily tank on the dashboard.
 */
export function getTodayUsage(sessions) {
  const today = new Date().toISOString().slice(0, 10)
  const todaysSessions = sessions.filter(s => s.date === today)

  const dl91bTotal = todaysSessions
    .filter(s => s.logType === LOG_TYPES.DL91B_OBSERVATION || s.logType === LOG_TYPES.DL91B_INSTRUCTION)
    .reduce((acc, s) => acc + (s.countedMinutes ?? s.totalMinutes ?? 0), 0)

  const dl91bInstr = todaysSessions
    .filter(s => s.logType === LOG_TYPES.DL91B_INSTRUCTION)
    .reduce((acc, s) => acc + (s.countedMinutes ?? s.totalMinutes ?? 0), 0)

  const thirtyHrToday = todaysSessions
    .filter(s => s.logType === LOG_TYPES.PRACTICE_30HR)
    .reduce((acc, s) => acc + (s.countedMinutes ?? s.totalMinutes ?? 0), 0)

  return { dl91bTotal, dl91bInstr, thirtyHrToday }
}
