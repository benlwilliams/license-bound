import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Moon, Clock, PenLine, ChevronRight } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { LOG_TYPE_LABELS, LOG_TYPES } from '@/utils/constants'
import { formatDate, formatMinutes, formatTime } from '@/utils/dateTime'

const LOG_BADGE_CLASS = {
  [LOG_TYPES.DL91B_OBSERVATION]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  [LOG_TYPES.DL91B_INSTRUCTION]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  [LOG_TYPES.PRACTICE_30HR]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
}

export default function SessionHistory() {
  const navigate = useNavigate()
  const { familyId } = useAuthStore()
  const { drivers, selectedDriverId, setSelectedDriver } = useProfileStore()
  const { loadSessions, getSessionsForDriver, loading } = useSessionStore()

  useEffect(() => {
    if (familyId && selectedDriverId) {
      loadSessions(familyId, selectedDriverId)
    }
  }, [familyId, selectedDriverId])

  const sessions = getSessionsForDriver(selectedDriverId)
  const sorted = [...sessions].sort((a, b) => {
    if (a.date !== b.date) return b.date > a.date ? 1 : -1
    return new Date(b.startTime) - new Date(a.startTime)
  })
  const selectedDriver = drivers.find(d => d.id === selectedDriverId)

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => navigate('/manual-entry')}
          >
            <PenLine size={14} />
            Add session
          </Button>
        </div>

        {drivers.length > 1 && (
          <Select value={selectedDriverId ?? ''} onValueChange={setSelectedDriver}>
            <SelectTrigger>
              <SelectValue placeholder="Select driver">
                {drivers.find(d => d.id === selectedDriverId)?.fullName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      {!selectedDriverId ? (
        <EmptyState message="Select a driver to view their session history." />
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          message={`No sessions logged for ${selectedDriver?.fullName ?? 'this driver'} yet.`}
          action="Add your first session"
          onAction={() => navigate('/manual-entry')}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map(session => (
            <SessionRow
              key={session.sessionId}
              session={session}
              onClick={() => navigate('/session-detail', { state: { session } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionRow({ session, onClick }) {
  return (
    <Card className="cursor-pointer active:opacity-75 transition-opacity" onClick={onClick}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{formatDate(new Date(session.date + 'T12:00:00'))}</span>
              <Badge className={`text-xs px-1.5 py-0 border-0 ${LOG_BADGE_CLASS[session.logType]}`}>
                {LOG_TYPE_LABELS[session.logType] ?? session.logType}
              </Badge>
              {session.isManualEntry && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                  Manual
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {formatTime(new Date(session.startTime))} – {formatTime(new Date(session.endTime))}
            </p>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-foreground/80">
                <Clock size={11} />
                {formatMinutes(session.countedMinutes)}
                {session.countedMinutes < session.totalMinutes && (
                  <span className="text-muted-foreground"> of {formatMinutes(session.totalMinutes)}</span>
                )}
              </span>
              {session.nightMinutes > 0 && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Moon size={11} />
                  {formatMinutes(session.nightMinutes)} night
                </span>
              )}
            </div>
          </div>

          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message, action, onAction }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3 mt-4">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>{action}</Button>
      )}
    </div>
  )
}
