import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Camera, CheckCircle2, Moon, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { calcCountedMinutes } from '@/services/capRules'
import { LOG_TYPES, LOG_TYPE_LABELS } from '@/utils/constants'
import { dayKey, formatDate, formatMinutes } from '@/utils/dateTime'
import { parseLogImage } from '@/firebase/functions'

// ── Module-level helpers ────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function toMs(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

function matchSupervisor(licenseNumber, supervisors) {
  if (!licenseNumber) return null
  const norm = s => (s ?? '').replace(/[\s\-]/g, '').toUpperCase()
  return supervisors.find(s => norm(s.licenseNumber) === norm(licenseNumber)) ?? null
}

const LOG_BADGE_CLASS = {
  [LOG_TYPES.DL91B_OBSERVATION]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0',
  [LOG_TYPES.DL91B_INSTRUCTION]:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-0',
  [LOG_TYPES.PRACTICE_30HR]:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0',
}

// ── Main screen ─────────────────────────────────────────────────────────────────

export default function LogImport() {
  const navigate = useNavigate()
  const { familyId } = useAuthStore()
  const { drivers, supervisors, selectedDriverId, loadProfiles } = useProfileStore()
  const { saveSession, loadSessions, getSessionsForDriver } = useSessionStore()

  const [driverId, setDriverId] = useState(selectedDriverId ?? '')

  // phase: 'upload' | 'analyzing' | 'review' | 'done'
  const [phase, setPhase] = useState('upload')

  // Upload phase
  const [formType, setFormType] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Review phase
  const [sessions, setSessions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (familyId) loadProfiles(familyId)
  }, [familyId])

  useEffect(() => {
    if (familyId && driverId) loadSessions(familyId, driverId)
  }, [familyId, driverId])

  async function handleAnalyze() {
    setUploadError(null)
    setPhase('analyzing')
    try {
      const base64 = await fileToBase64(imageFile)
      const result = await parseLogImage({
        imageBase64: base64,
        formType,
        mediaType: imageFile.type || 'image/jpeg',
      })
      const extracted = result.data?.sessions ?? []
      if (extracted.length === 0) {
        setUploadError(
          'No sessions were found in the image. Make sure the form is fully visible and try a clearer photo.'
        )
        setPhase('upload')
      } else {
        setSessions(extracted)
        setCurrentIndex(0)
        setSavedCount(0)
        setPhase('review')
      }
    } catch (err) {
      console.error('parseLogImage error:', err)
      setUploadError(err.message || 'Failed to analyze the photo. Please try again.')
      setPhase('upload')
    }
  }

  async function handleSaveSession(sessionData) {
    setSaving(true)
    try {
      await saveSession(familyId, sessionData)
      setSavedCount(c => c + 1)
      toast.success('Session saved')
      advance()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    advance()
  }

  function advance() {
    if (currentIndex + 1 >= sessions.length) {
      setPhase('done')
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Import from paper log</h1>
      </header>

      {phase === 'upload' && (
        <UploadPhase
          drivers={drivers}
          driverId={driverId}
          setDriverId={setDriverId}
          formType={formType}
          setFormType={setFormType}
          imageFile={imageFile}
          uploadError={uploadError}
          onFileChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            setImageFile(file)
            setUploadError(null)
          }}
          onAnalyze={handleAnalyze}
        />
      )}

      {phase === 'analyzing' && <AnalyzingPhase />}

      {phase === 'review' && (
        <SessionReviewCard
          extracted={sessions[currentIndex]}
          index={currentIndex}
          total={sessions.length}
          supervisors={supervisors}
          driverId={driverId}
          allSessionsForDriver={getSessionsForDriver(driverId)}
          saving={saving}
          onSave={handleSaveSession}
          onSkip={handleSkip}
        />
      )}

      {phase === 'done' && (
        <DonePhase
          savedCount={savedCount}
          onNavigate={() => navigate('/history')}
        />
      )}
    </div>
  )
}

// ── Upload phase ────────────────────────────────────────────────────────────────

function UploadPhase({
  drivers, driverId, setDriverId,
  formType, setFormType,
  imageFile, uploadError,
  onFileChange, onAnalyze,
}) {
  const canAnalyze = formType && imageFile && driverId

  const formTypeLabel =
    formType === 'dl91b' ? 'DL-91B (Observation & Instruction)' :
    formType === 'practice-30hr' ? '30-Hour Practice Log' :
    undefined

  return (
    <div className="flex flex-col gap-5">
      {/* Driver selector — only shown when multiple drivers exist */}
      {drivers.length > 1 && (
        <div className="space-y-1.5">
          <Label>Driver</Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select driver">
                {drivers.find(d => d.id === driverId)?.fullName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Form type selector */}
      <div className="space-y-1.5">
        <Label>Which log form is this?</Label>
        <Select value={formType} onValueChange={setFormType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select form type">
              {formTypeLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dl91b">DL-91B (Observation &amp; Instruction)</SelectItem>
            <SelectItem value="practice-30hr">30-Hour Practice Log</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Photo upload */}
      <div className="space-y-3">
        <Label>Photo of the log form</Label>
        {/* Plain HTML input — shadcn Input doesn't forward the capture attribute */}
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          id="photo-upload-input"
          onChange={onFileChange}
        />
        <label htmlFor="photo-upload-input" className="block cursor-pointer">
          <div className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-5 hover:border-ring transition-colors ${imageFile ? 'border-ring bg-muted/40' : 'border-border'}`}>
            <Camera size={24} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              {imageFile ? (
                <>
                  <p className="text-sm font-medium truncate">{imageFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tap to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Take or choose a file</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Photo or PDF of the filled-in log form</p>
                </>
              )}
            </div>
          </div>
        </label>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <Button size="lg" className="w-full" onClick={onAnalyze} disabled={!canAnalyze}>
        Analyze photo
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Analysis takes up to 30 seconds. Your image is sent securely and not stored.
      </p>
    </div>
  )
}

// ── Analyzing phase ─────────────────────────────────────────────────────────────

function AnalyzingPhase() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <div>
        <p className="font-medium">Analyzing photo…</p>
        <p className="text-sm text-muted-foreground mt-1">This can take up to 30 seconds</p>
      </div>
    </div>
  )
}

// ── Session review card ─────────────────────────────────────────────────────────

function SessionReviewCard({
  extracted,
  index,
  total,
  supervisors,
  driverId,
  allSessionsForDriver,
  saving,
  onSave,
  onSkip,
}) {
  const matched = matchSupervisor(extracted.supervisorLicense, supervisors)

  const [editMode, setEditMode] = useState(false)
  const [supervisorId, setSupervisorId] = useState(matched?.id ?? '')
  const [editValues, setEditValues] = useState(null)

  // Reset state whenever the extracted session changes (user advances to next card)
  useEffect(() => {
    const newMatched = matchSupervisor(extracted.supervisorLicense, supervisors)
    setSupervisorId(newMatched?.id ?? '')
    setEditMode(false)
    setEditValues(null)
  }, [extracted])

  function enterEditMode() {
    setEditValues({
      date: extracted.date ?? '',
      startTime: extracted.startTime ?? '',
      endTime: extracted.endTime ?? '',
      logType: extracted.logType ?? LOG_TYPES.DL91B_OBSERVATION,
      nightMinutes: extracted.nightMinutes ?? 0,
    })
    setEditMode(true)
  }

  function setEdit(field, val) {
    setEditValues(v => ({ ...v, [field]: val }))
  }

  function handleSave() {
    const vals = editMode
      ? editValues
      : {
          date: extracted.date,
          startTime: extracted.startTime,
          endTime: extracted.endTime,
          logType: extracted.logType,
          nightMinutes: extracted.nightMinutes ?? 0,
        }

    const startMs = toMs(vals.date, vals.startTime)
    const endMs = toMs(vals.date, vals.endTime)
    if (!startMs || !endMs || endMs <= startMs) {
      toast.error('Check the start and end times')
      return
    }
    if (!supervisorId) {
      toast.error('Select a supervisor before saving')
      return
    }

    const totalMinutes = Math.round((endMs - startMs) / 60000)
    const nightMinutes =
      vals.logType === LOG_TYPES.PRACTICE_30HR ? (Number(vals.nightMinutes) || 0) : 0

    // Apply daily cap using the same logic as ManualEntry
    const todaysSessions = allSessionsForDriver.filter(s => s.date === vals.date)
    const countedMinutes = calcCountedMinutes(
      { logType: vals.logType, totalMinutes, date: vals.date },
      todaysSessions
    )

    onSave({
      driverId,
      supervisorId,
      logType: vals.logType,
      date: vals.date,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      totalMinutes,
      countedMinutes,
      nightMinutes,
      isNightSession: nightMinutes > 0,
      gpsRoute: [],
      hasGPS: false,
      isManualEntry: true,
      syncedToCloud: false,
      createdAt: new Date().toISOString(),
    })
  }

  const isAmber =
    extracted.confidence === 'low' ||
    extracted.confidence === 'medium' ||
    !!extracted.issues

  const confidenceLabel =
    extracted.confidence === 'high' ? null :
    extracted.confidence === 'medium' ? 'Review suggested' :
    'Low confidence'

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Session {index + 1} of {total}</span>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-colors',
                i < index ? 'bg-green-500 w-3' :
                i === index ? 'bg-primary w-3' :
                'bg-muted w-2'
              )}
            />
          ))}
        </div>
      </div>

      <Card className={cn(isAmber && 'ring-1 ring-amber-400 dark:ring-amber-500')}>
        <CardContent className="space-y-4">

          {/* Confidence / issues banner */}
          {(confidenceLabel || extracted.issues) && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {confidenceLabel && (
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    {confidenceLabel}
                  </p>
                )}
                {extracted.issues && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">{extracted.issues}</p>
                )}
              </div>
            </div>
          )}

          {editMode ? (
            /* ── Edit mode ── */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editValues.date}
                  max={dayKey(new Date())}
                  onChange={e => setEdit('date', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={editValues.startTime}
                    onChange={e => setEdit('startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={editValues.endTime}
                    onChange={e => setEdit('endTime', e.target.value)}
                  />
                </div>
              </div>

              {/* Log type only editable for DL-91B rows */}
              {editValues.logType !== LOG_TYPES.PRACTICE_30HR && (
                <div className="space-y-1.5">
                  <Label>Log type</Label>
                  <Select value={editValues.logType} onValueChange={v => setEdit('logType', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {LOG_TYPE_LABELS[editValues.logType]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LOG_TYPES.DL91B_OBSERVATION}>
                        {LOG_TYPE_LABELS[LOG_TYPES.DL91B_OBSERVATION]}
                      </SelectItem>
                      <SelectItem value={LOG_TYPES.DL91B_INSTRUCTION}>
                        {LOG_TYPE_LABELS[LOG_TYPES.DL91B_INSTRUCTION]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Night minutes only for 30-hr rows */}
              {editValues.logType === LOG_TYPES.PRACTICE_30HR && (
                <div className="space-y-1.5">
                  <Label>
                    Night minutes{' '}
                    <span className="text-muted-foreground font-normal">(from form)</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editValues.nightMinutes}
                    onChange={e => setEdit('nightMinutes', e.target.value)}
                  />
                </div>
              )}
            </div>
          ) : (
            /* ── Display mode ── */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">
                  {extracted.date
                    ? formatDate(new Date(extracted.date + 'T12:00:00'))
                    : 'Unknown date'}
                </span>
                <Badge className={`text-xs ${LOG_BADGE_CLASS[extracted.logType] ?? 'bg-muted text-muted-foreground border-0'}`}>
                  {LOG_TYPE_LABELS[extracted.logType] ?? extracted.logType ?? 'Unknown type'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {extracted.startTime} – {extracted.endTime}
              </p>
              {(extracted.nightMinutes ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                  <Moon size={12} />
                  {formatMinutes(extracted.nightMinutes)} night
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Supervisor — auto-matched or manual select */}
          <div className="space-y-1.5">
            <Label>Supervisor</Label>
            {matched && !editMode ? (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{matched.fullName}</p>
                  {matched.licenseNumber && (
                    <p className="text-xs text-muted-foreground">{matched.licenseNumber}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">Matched</Badge>
              </div>
            ) : (
              <>
                {extracted.supervisorLicense && (
                  <p className="text-xs text-muted-foreground mb-1.5">
                    License on form: {extracted.supervisorLicense}
                  </p>
                )}
                <Select value={supervisorId} onValueChange={setSupervisorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supervisor">
                      {supervisors.find(s => s.id === supervisorId)?.fullName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} — {s.licenseNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {editMode ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save & continue'}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onSkip} disabled={saving}>
            Skip
          </Button>
          <Button variant="outline" className="flex-1" onClick={enterEditMode} disabled={saving}>
            Edit
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Done phase ──────────────────────────────────────────────────────────────────

function DonePhase({ savedCount, onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <CheckCircle2 size={52} className="text-green-500" />
      <div>
        <p className="text-lg font-semibold">Import complete</p>
        <p className="text-sm text-muted-foreground mt-1">
          {savedCount === 0
            ? 'No sessions were saved.'
            : savedCount === 1
            ? '1 session saved to your log.'
            : `${savedCount} sessions saved to your log.`}
        </p>
      </div>
      <Button onClick={onNavigate}>View history</Button>
    </div>
  )
}
