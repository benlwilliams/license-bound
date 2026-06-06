import {
  LOG_TYPES,
  DL91B_DAILY_MAX_MINUTES,
  DL91B_DAILY_INSTRUCTION_MAX,
  THIRTY_HR_DAILY_MAX_MINUTES,
} from '@/utils/constants'
import { dayKey } from '@/utils/dateTime'

/**
 * Given a new session and all sessions already recorded for the same driver
 * on that same day, returns how many minutes of the new session count toward
 * its log (countedMinutes). Always ≤ totalMinutes.
 *
 * @param {object} newSession  - includes logType, totalMinutes, date
 * @param {object[]} todaysSessions - all other sessions for this driver on this date
 * @returns {number} countedMinutes
 */
export function calcCountedMinutes(newSession, todaysSessions) {
  const { logType, totalMinutes } = newSession
  const date = newSession.date

  // Only count sessions that are already saved (not the new one being evaluated)
  const existing = todaysSessions.filter(s => s.date === date)

  if (logType === LOG_TYPES.DL91B_OBSERVATION) {
    return calcDL91BObservationCounted(totalMinutes, existing)
  }
  if (logType === LOG_TYPES.DL91B_INSTRUCTION) {
    return calcDL91BInstructionCounted(totalMinutes, existing)
  }
  if (logType === LOG_TYPES.PRACTICE_30HR) {
    return calc30HrCounted(totalMinutes, existing)
  }
  return totalMinutes
}

// ── DL-91B helpers ────────────────────────────────────────────────────────────

function calcDL91BObservationCounted(totalMinutes, existing) {
  const usedObs = sumMinutes(existing, LOG_TYPES.DL91B_OBSERVATION)
  const usedInstr = sumMinutes(existing, LOG_TYPES.DL91B_INSTRUCTION)
  const usedTotal = usedObs + usedInstr

  // Total DL-91B daily cap
  const remainingTotal = Math.max(0, DL91B_DAILY_MAX_MINUTES - usedTotal)

  return Math.min(totalMinutes, remainingTotal)
}

function calcDL91BInstructionCounted(totalMinutes, existing) {
  const usedObs = sumMinutes(existing, LOG_TYPES.DL91B_OBSERVATION)
  const usedInstr = sumCountedMinutes(existing, LOG_TYPES.DL91B_INSTRUCTION)
  const usedTotal = usedObs + usedInstr

  // Both the instruction-specific cap and the overall daily cap apply
  const remainingInstr = Math.max(0, DL91B_DAILY_INSTRUCTION_MAX - usedInstr)
  const remainingTotal = Math.max(0, DL91B_DAILY_MAX_MINUTES - usedTotal)

  return Math.min(totalMinutes, remainingInstr, remainingTotal)
}

// ── 30-Hour helpers ───────────────────────────────────────────────────────────

function calc30HrCounted(totalMinutes, existing) {
  const usedToday = sumCountedMinutes(existing, LOG_TYPES.PRACTICE_30HR)
  const remaining = Math.max(0, THIRTY_HR_DAILY_MAX_MINUTES - usedToday)
  return Math.min(totalMinutes, remaining)
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Sum totalMinutes for sessions of a given logType */
function sumMinutes(sessions, logType) {
  return sessions
    .filter(s => s.logType === logType)
    .reduce((acc, s) => acc + (s.totalMinutes ?? 0), 0)
}

/** Sum countedMinutes for sessions of a given logType */
function sumCountedMinutes(sessions, logType) {
  return sessions
    .filter(s => s.logType === logType)
    .reduce((acc, s) => acc + (s.countedMinutes ?? s.totalMinutes ?? 0), 0)
}

/**
 * Recalculates countedMinutes for all sessions on a given date for a driver.
 * Used when editing/deleting sessions to recompute ordering-dependent caps.
 * Sessions are assumed to be sorted chronologically (earliest first).
 *
 * @param {object[]} daySessions - sorted by startTime ascending
 * @returns {object[]} sessions with updated countedMinutes
 */
export function recalcDaySessions(daySessions) {
  const sorted = [...daySessions].sort((a, b) =>
    new Date(a.startTime) - new Date(b.startTime)
  )

  const result = []
  for (const session of sorted) {
    const counted = calcCountedMinutes(session, result)
    result.push({ ...session, countedMinutes: counted })
  }
  return result
}
