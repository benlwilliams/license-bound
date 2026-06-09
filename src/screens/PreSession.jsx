import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, Play, Info, TriangleAlert } from 'lucide-react'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { LOG_TYPES, LOG_TYPE_LABELS } from '@/utils/constants'
import { getDailyRemainingMinutes } from '@/services/capRules'
import { dayKey } from '@/utils/dateTime'

export default function PreSession() {
  const navigate = useNavigate()
  const { drivers, supervisors, selectedDriverId, selectedSupervisorId } = useProfileStore()
  const getSessionsForDriver = useSessionStore(s => s.getSessionsForDriver)

  const [values, setValues] = useState({
    driverId: selectedDriverId ?? '',
    supervisorId: selectedSupervisorId ?? '',
    logType: '',
    city: 'Austin',
  })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setValues(v => ({ ...v, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const capReached = values.driverId && values.logType
    ? getDailyRemainingMinutes(
        values.logType,
        getSessionsForDriver(values.driverId).filter(s => s.date === dayKey())
      ) <= 0
    : false

  function handleStart() {
    const errs = {}
    if (!values.driverId) errs.driverId = 'Select a driver'
    if (!values.supervisorId) errs.supervisorId = 'Select a supervisor'
    if (!values.logType) errs.logType = 'Select a log type'
    if (Object.keys(errs).length) { setErrors(errs); return }

    navigate('/session/live', { state: values })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">New session</h1>
      </header>

      {capReached ? (
        <div className="flex gap-3 bg-yellow-500/15 border border-yellow-500/40 text-yellow-800 dark:text-yellow-300 rounded-lg px-4 py-3">
          <TriangleAlert size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Daily limit reached</p>
            <p className="text-yellow-700 dark:text-yellow-400 mt-0.5">
              You've already logged the maximum time for <strong>{LOG_TYPE_LABELS[values.logType]}</strong> today. Come back tomorrow.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Driver */}
          <div className="space-y-1.5">
            <Label>Driver</Label>
            <Select value={values.driverId} onValueChange={v => set('driverId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver">
                  {drivers.find(d => d.id === values.driverId)?.fullName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.driverId && <p className="text-xs text-destructive">{errors.driverId}</p>}
          </div>

          {/* Supervisor */}
          <div className="space-y-1.5">
            <Label>Supervisor</Label>
            <Select value={values.supervisorId} onValueChange={v => set('supervisorId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor">
                  {supervisors.find(s => s.id === values.supervisorId)?.fullName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supervisors.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.fullName} — {s.relationship}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supervisorId && <p className="text-xs text-destructive">{errors.supervisorId}</p>}
          </div>

          {/* Log type */}
          <div className="space-y-1.5">
            <Label>Log type</Label>
            <Select value={values.logType} onValueChange={v => set('logType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Which log does this count toward?">
                  {values.logType ? LOG_TYPE_LABELS[values.logType] : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LOG_TYPES.DL91B_OBSERVATION}>{LOG_TYPE_LABELS[LOG_TYPES.DL91B_OBSERVATION]}</SelectItem>
                <SelectItem value={LOG_TYPES.DL91B_INSTRUCTION}>{LOG_TYPE_LABELS[LOG_TYPES.DL91B_INSTRUCTION]}</SelectItem>
                <SelectItem value={LOG_TYPES.PRACTICE_30HR}>{LOG_TYPE_LABELS[LOG_TYPES.PRACTICE_30HR]}</SelectItem>
              </SelectContent>
            </Select>
            {errors.logType && <p className="text-xs text-destructive">{errors.logType}</p>}
          </div>

          {/* Log type hint */}
          {values.logType && (
            <div className="flex gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>{logTypeHint(values.logType)}</span>
            </div>
          )}

          {/* City — only for 30-hour practice */}
          {values.logType === LOG_TYPES.PRACTICE_30HR && (
            <div className="space-y-1.5">
              <Label>City <span className="text-muted-foreground font-normal">(for night hours)</span></Label>
              <Input
                value={values.city}
                onChange={e => set('city', e.target.value)}
                placeholder="e.g. Austin, Dallas, Houston"
              />
              <p className="text-xs text-muted-foreground">Used to calculate sunset/sunrise. Defaults to Austin if not found.</p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full mt-2 gap-2 h-14"
            onClick={handleStart}
          >
            <Play size={18} />
            Start driving
          </Button>
        </>
      )}
    </div>
  )
}

function logTypeHint(logType) {
  switch (logType) {
    case LOG_TYPES.DL91B_OBSERVATION:
      return 'Parent instructor drives while teen observes. Max 4 hrs/day combined with instruction.'
    case LOG_TYPES.DL91B_INSTRUCTION:
      return 'Teen drives with licensed parent instructor. Max 2 hrs/day, 4 hrs/day combined with observation.'
    case LOG_TYPES.PRACTICE_30HR:
      return 'Teen drives with any qualified adult 21+. Max 1 hr/day. Night hours counted automatically.'
    default:
      return ''
  }
}
