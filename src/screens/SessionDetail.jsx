import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, Clock, Moon, MapPin, User, Users, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { LOG_TYPE_LABELS, LOG_TYPES } from '@/utils/constants'
import { formatDate, formatMinutes, formatTime } from '@/utils/dateTime'

const LOG_BADGE_CLASS = {
  [LOG_TYPES.DL91B_OBSERVATION]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  [LOG_TYPES.DL91B_INSTRUCTION]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  [LOG_TYPES.PRACTICE_30HR]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
}

export default function SessionDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { familyId } = useAuthStore()
  const { drivers, supervisors } = useProfileStore()
  const { deleteSession } = useSessionStore()

  const session = location.state?.session
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <p className="text-muted-foreground text-sm">Session not found.</p>
        <Button variant="outline" onClick={() => navigate('/history')}>Back to History</Button>
      </div>
    )
  }

  const driver = drivers.find(d => d.id === session.driverId)
  const supervisor = supervisors.find(s => s.id === session.supervisorId)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSession(familyId, session.sessionId, session.driverId)
      toast.success('Session deleted')
      navigate('/history')
    } catch (err) {
      console.error('Delete session error:', err)
      toast.error('Failed to delete session')
      setDeleting(false)
    }
  }

  const isCapped = session.countedMinutes < session.totalMinutes

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <header className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold tracking-tight flex-1">Session detail</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/manual-entry', { state: { session } })}
        >
          <Pencil size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={16} />
        </Button>
      </header>

      {/* Date + log type */}
      <div className="space-y-1">
        <p className="text-2xl font-bold">{formatDate(new Date(session.date + 'T12:00:00'))}</p>
        <div className="flex items-center gap-2">
          <Badge className={`border-0 ${LOG_BADGE_CLASS[session.logType]}`}>
            {LOG_TYPE_LABELS[session.logType] ?? session.logType}
          </Badge>
          {session.isManualEntry && (
            <Badge variant="outline" className="text-xs text-muted-foreground">Manual entry</Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Time details */}
      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          <DetailRow
            icon={<Clock size={15} className="text-muted-foreground" />}
            label="Drive window"
            value={`${formatTime(new Date(session.startTime))} – ${formatTime(new Date(session.endTime))}`}
          />
          <DetailRow
            icon={<Clock size={15} className="text-muted-foreground" />}
            label="Total time"
            value={formatMinutes(session.totalMinutes)}
          />
          <DetailRow
            icon={<Clock size={15} className="text-muted-foreground" />}
            label="Counted toward log"
            value={
              <span className="flex items-center gap-2">
                {formatMinutes(session.countedMinutes)}
                {isCapped && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 text-yellow-600 border-yellow-400">
                    Daily cap applied
                  </Badge>
                )}
              </span>
            }
          />
          {session.logType === LOG_TYPES.PRACTICE_30HR && (
            <DetailRow
              icon={<Moon size={15} className="text-muted-foreground" />}
              label="Night hours"
              value={session.nightMinutes > 0 ? formatMinutes(session.nightMinutes) : 'None'}
            />
          )}
          {session.city && session.logType === LOG_TYPES.PRACTICE_30HR && (
            <DetailRow
              icon={<MapPin size={15} className="text-muted-foreground" />}
              label="City"
              value={session.city}
            />
          )}
        </CardContent>
      </Card>

      {/* People */}
      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          {driver && (
            <DetailRow
              icon={<User size={15} className="text-muted-foreground" />}
              label="Driver"
              value={driver.fullName}
            />
          )}
          {supervisor && (
            <DetailRow
              icon={<Users size={15} className="text-muted-foreground" />}
              label="Supervisor"
              value={`${supervisor.fullName} (${supervisor.relationship})`}
            />
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => navigate('/manual-entry', { state: { session } })}
        >
          <Pencil size={14} />
          Edit session
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={14} />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={open => !open && setConfirmDelete(false)}
        title="Delete this session?"
        description="This will permanently remove the session and its hours from the log. This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete session'}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  )
}
