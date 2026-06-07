import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, Clock, Moon, Calendar, AlertTriangle } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { getProgress } from '@/services/progress'
import { formatMinutes, formatDate, daysBetween } from '@/utils/dateTime'
import { MIN_CALENDAR_DAYS } from '@/utils/constants'

export default function RoadTestReadiness() {
  const { familyId } = useAuthStore()
  const { drivers, selectedDriverId } = useProfileStore()
  const { loadSessions, getSessionsForDriver } = useSessionStore()

  useEffect(() => {
    if (familyId && selectedDriverId) {
      loadSessions(familyId, selectedDriverId)
    }
  }, [familyId, selectedDriverId])

  const sessions = getSessionsForDriver(selectedDriverId)
  const progress = useMemo(() => getProgress(sessions), [sessions])
  const driver = drivers.find(d => d.id === selectedDriverId)

  // Calendar day check
  const today = new Date()
  const calendarDaysMet = progress.earliestTestDate
    ? today >= progress.earliestTestDate
    : false
  const daysElapsed = progress.firstSessionDate
    ? daysBetween(progress.firstSessionDate, today.toISOString().slice(0, 10))
    : 0
  const daysRemaining = Math.max(0, MIN_CALENDAR_DAYS - daysElapsed)

  const allMet = progress.isComplete && calendarDaysMet

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="pt-2 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Ready?</h1>
        {driver && (
          <p className="text-muted-foreground text-sm">{driver.fullName}</p>
        )}
      </header>

      {/* Overall status banner */}
      {sessions.length === 0 ? (
        <StatusBanner
          icon={<AlertTriangle size={18} />}
          color="muted"
          title="No sessions logged yet"
          subtitle="Log your first session to start tracking progress toward the road test."
        />
      ) : allMet ? (
        <StatusBanner
          icon={<CheckCircle2 size={18} />}
          color="green"
          title="All requirements met!"
          subtitle={`${driver?.fullName ?? 'Your teen'} is eligible to take the road test. Contact your local DPS office to schedule.`}
        />
      ) : (
        <StatusBanner
          icon={<Clock size={18} className="text-amber-500" />}
          color="plain"
          title="In progress"
          subtitle="Keep driving — the requirements below show what's still needed."
        />
      )}

      {/* ── DL-91B Log ── */}
      <Section title="DL-91B Log" subtitle="With licensed parent instructor">
        <RequirementRow
          label="Observation hours"
          detail="Parent drives, teen observes"
          value={progress.dl91bObs}
          target={progress.dl91bObsTarget}
        />
        <RequirementRow
          label="Instruction hours"
          detail="Teen drives, parent supervises"
          value={progress.dl91bInstr}
          target={progress.dl91bInstrTarget}
        />
      </Section>

      {/* ── 30-Hour Practice ── */}
      <Section title="30-Hour Practice" subtitle="Any qualified adult 21+ with 1+ year license">
        <RequirementRow
          label="Total practice hours"
          value={progress.thirtyHr}
          target={progress.thirtyHrTarget}
        />
        <RequirementRow
          label="Night hours"
          detail="30 min after sunset to 30 min before sunrise"
          value={progress.nightHrs}
          target={progress.nightHrsTarget}
          icon={<Moon size={13} className="text-indigo-400" />}
        />
      </Section>

      {/* ── 44-Day Minimum ── */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              {calendarDaysMet
                ? <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                : <XCircle size={18} className="text-muted-foreground shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <p className="text-sm font-medium">44-day minimum</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {calendarDaysMet
                    ? `Met — ${daysElapsed} days since first session`
                    : progress.firstSessionDate
                      ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                      : 'Start logging sessions to begin the 44-day clock'
                  }
                </p>
                {progress.earliestTestDate && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar size={11} />
                    Earliest: {formatDate(progress.earliestTestDate)}
                  </p>
                )}
              </div>
            </div>
            {calendarDaysMet
              ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 shrink-0">Done</Badge>
              : <Badge variant="outline" className="shrink-0 text-muted-foreground">{daysElapsed}/{MIN_CALENDAR_DAYS} days</Badge>
            }
          </div>
        </CardContent>
      </Card>

      {/* Texas DPS note */}
      <p className="text-xs text-muted-foreground text-center px-4 pb-2">
        Requirements based on Texas DPS Graduated Driver License program.
        Verify current rules at dps.texas.gov before scheduling your road test.
      </p>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBanner({ icon, color, title, subtitle }) {
  if (color === 'plain') {
    return (
      <div className="flex items-start gap-3 px-1 py-1">
        <span className="shrink-0 mt-0.5">{icon}</span>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
    )
  }
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    muted: 'bg-muted border-border text-muted-foreground',
  }
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${colors[color]}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs mt-0.5 opacity-80">{subtitle}</p>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <Separator />
        <div className="space-y-3">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

function RequirementRow({ label, detail, value, target, icon }) {
  const met = value >= target
  const frac = Math.min(1, target > 0 ? value / target : 0)
  const remaining = Math.max(0, target - value)

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {met
            ? <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
            : <XCircle size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" />
          }
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-1.5">
              {icon}
              {label}
            </p>
            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          {met
            ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs px-1.5 py-0">Done</Badge>
            : <span className="text-xs text-muted-foreground">{formatMinutes(remaining)} left</span>
          }
        </div>
      </div>

      {/* Progress bar */}
      <div className="ml-5 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${met ? 'bg-green-500' : 'bg-primary/60'}`}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <p className="ml-5 text-xs text-muted-foreground">
        {formatMinutes(value)} of {formatMinutes(target)}
      </p>
    </div>
  )
}
