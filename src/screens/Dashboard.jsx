import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Play, PenLine, Moon, Calendar, TrendingUp, ChevronDown } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { getProgress, getPaceProjection, getTodayUsage } from '@/services/progress'
import {
  DL91B_DAILY_MAX_MINUTES,
  DL91B_DAILY_INSTRUCTION_MAX,
  THIRTY_HR_DAILY_MAX_MINUTES,
} from '@/utils/constants'
import { formatMinutes, formatDate } from '@/utils/dateTime'

export default function Dashboard() {
  const navigate = useNavigate()
  const { familyId } = useAuthStore()
  const { loadProfiles, drivers, supervisors, selectedDriverId } = useProfileStore()
  const { loadSessions, getSessionsForDriver } = useSessionStore()

  useEffect(() => {
    if (familyId) loadProfiles(familyId)
  }, [familyId])

  useEffect(() => {
    if (familyId && selectedDriverId) {
      loadSessions(familyId, selectedDriverId)
    }
  }, [familyId, selectedDriverId])

  const sessions = getSessionsForDriver(selectedDriverId)
  const progress = useMemo(() => getProgress(sessions), [sessions])
  const pace = useMemo(() => getPaceProjection(sessions, progress), [sessions, progress])
  const todayUsage = useMemo(() => getTodayUsage(sessions), [sessions])

  const hasProfiles = drivers.length > 0 && supervisors.length > 0
  const driver = drivers.find(d => d.id === selectedDriverId)

  const dl91bRemainingToday = Math.max(0, DL91B_DAILY_MAX_MINUTES - todayUsage.dl91bTotal)
  const dl91bInstrRemainingToday = Math.max(0, DL91B_DAILY_INSTRUCTION_MAX - todayUsage.dl91bInstr)
  const thirtyHrRemainingToday = Math.max(0, THIRTY_HR_DAILY_MAX_MINUTES - todayUsage.thirtyHrToday)

  const isDl91bComplete = progress.dl91bObsFrac >= 1 && progress.dl91bInstrFrac >= 1
  const isThirtyHrComplete = progress.thirtyHrFrac >= 1 && progress.nightHrsFrac >= 1

  const [dl91bOpen, setDl91bOpen] = useState(true)
  const [thirtyHrOpen, setThirtyHrOpen] = useState(true)
  const autoCollapsed = useRef({ dl91b: false, thirtyHr: false })

  useEffect(() => {
    if (isDl91bComplete && !autoCollapsed.current.dl91b) {
      autoCollapsed.current.dl91b = true
      setDl91bOpen(false)
    }
  }, [isDl91bComplete])

  useEffect(() => {
    if (isThirtyHrComplete && !autoCollapsed.current.thirtyHr) {
      autoCollapsed.current.thirtyHr = true
      setThirtyHrOpen(false)
    }
  }, [isThirtyHrComplete])

  if (!hasProfiles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <div className="text-4xl">🚗</div>
        <h2 className="text-xl font-semibold">Welcome to LicenseBound</h2>
        <p className="text-muted-foreground text-sm">
          Add a driver and at least one supervisor to get started.
        </p>
        <Button onClick={() => navigate('/profiles')}>Set up profiles</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {driver ? driver.fullName : 'No driver selected'}
        </p>
      </header>

      {/* ── DL-91B Log ── */}
      <Card>
        <CardContent className="space-y-3">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => isDl91bComplete && setDl91bOpen(o => !o)}
            style={{ cursor: isDl91bComplete ? 'pointer' : 'default' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              DL-91B Log
            </p>
            {isDl91bComplete && (
              <div className="flex items-center gap-2">
                {!dl91bOpen && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs">
                    Completed
                  </Badge>
                )}
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-transform duration-200 ${dl91bOpen ? 'rotate-180' : ''}`}
                />
              </div>
            )}
          </button>

          {dl91bOpen && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <RingCell
                  label="Observation"
                  value={progress.dl91bObs}
                  max={progress.dl91bObsTarget}
                  frac={progress.dl91bObsFrac}
                  color="#3b82f6"
                />
                <RingCell
                  label="Instruction"
                  value={progress.dl91bInstr}
                  max={progress.dl91bInstrTarget}
                  frac={progress.dl91bInstrFrac}
                  color="#8b5cf6"
                />
              </div>

              <DailyCapRow items={[
                { label: 'Combined today', remaining: dl91bRemainingToday, max: DL91B_DAILY_MAX_MINUTES },
                { label: 'Instruction', remaining: dl91bInstrRemainingToday, max: DL91B_DAILY_INSTRUCTION_MAX },
              ]} />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 30-Hour Practice ── */}
      <Card>
        <CardContent className="space-y-3">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => isThirtyHrComplete && setThirtyHrOpen(o => !o)}
            style={{ cursor: isThirtyHrComplete ? 'pointer' : 'default' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              30-Hour Practice
            </p>
            {isThirtyHrComplete && (
              <div className="flex items-center gap-2">
                {!thirtyHrOpen && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs">
                    Completed
                  </Badge>
                )}
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-transform duration-200 ${thirtyHrOpen ? 'rotate-180' : ''}`}
                />
              </div>
            )}
          </button>

          {thirtyHrOpen && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <RingCell
                  label="Practice hours"
                  value={progress.thirtyHr}
                  max={progress.thirtyHrTarget}
                  frac={progress.thirtyHrFrac}
                  color="#22c55e"
                />
                <RingCell
                  label="Night hours"
                  value={progress.nightHrs}
                  max={progress.nightHrsTarget}
                  frac={progress.nightHrsFrac}
                  color="#6366f1"
                  icon={<Moon size={10} className="text-indigo-400 mb-0.5" />}
                />
              </div>

              <DailyCapRow items={[
                { label: "Today's Driving Time Allowed", remaining: thirtyHrRemainingToday, max: THIRTY_HR_DAILY_MAX_MINUTES },
              ]} />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Road Test Projection ── */}
      <Card>
        <CardContent className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Road Test
          </p>

          {progress.earliestTestDate && new Date(progress.earliestTestDate) > new Date() && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  <span>Earliest allowed</span>
                </div>
                <span className="text-sm font-medium">
                  {formatDate(progress.earliestTestDate)}
                </span>
              </div>

              <Separator />
            </>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp size={14} />
              <span>At current pace</span>
            </div>
            <span className="text-sm font-medium">
              {pace.projectedDate ? formatDate(pace.projectedDate) : '—'}
            </span>
          </div>

          {pace.minutesPerDay > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              Avg {formatMinutes(pace.minutesPerDay)}/day over last 30 days
            </p>
          )}

          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              Log your first session to see a projection.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Action buttons ── */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        <Button
          size="lg"
          className="h-16 text-base flex-col gap-1"
          onClick={() => navigate('/session/pre')}
        >
          <Play size={20} />
          Start Session
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-16 text-base flex-col gap-1"
          onClick={() => navigate('/manual-entry')}
        >
          <PenLine size={20} />
          Manual Entry
        </Button>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressRing({ frac, size = 76, strokeWidth = 7, color = '#3b82f6' }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(1, Math.max(0, frac)))

  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={strokeWidth}
        className="stroke-muted"
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={strokeWidth}
        stroke={color}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

function RingCell({ label, value, max, frac, color, icon }) {
  const pct = Math.round(frac * 100)
  const maxHrs = Math.round(max / 60)
  const valHrs = (value / 60).toFixed(1)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <ProgressRing frac={frac} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon}
          <span className="text-base font-bold leading-none">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{valHrs}h of {maxHrs}h</p>
      </div>
    </div>
  )
}

function DailyCapRow({ items }) {
  return (
    <div className="flex gap-4 pt-2 border-t border-border/50">
      {items.map(({ label, remaining, max }) => {
        const usedPct = Math.min(100, Math.round((1 - remaining / max) * 100))
        const allUsed = remaining === 0
        return (
          <div key={label} className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="text-muted-foreground truncate">{label}</span>
              <span className={`font-medium ml-1 shrink-0 ${allUsed ? 'text-muted-foreground' : 'text-foreground'}`}>
                {allUsed ? 'At cap' : `${formatMinutes(remaining)} left`}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usedPct}%`,
                  backgroundColor: allUsed ? 'var(--muted-foreground)' : 'var(--primary)',
                  opacity: allUsed ? 0.4 : 0.7,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
