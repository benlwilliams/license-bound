import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PDFDownloadLink, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, FileDown, Clock, Moon } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import useSessionStore from '@/store/sessionStore'
import { getProgress } from '@/services/progress'
import { LOG_TYPES, LOG_TYPE_LABELS } from '@/utils/constants'
import { formatDate, formatTime, formatMinutes } from '@/utils/dateTime'

// ── PDF Document ───────────────────────────────────────────────────────────────

const C = {
  black: '#111111',
  gray: '#555555',
  lightGray: '#888888',
  border: '#cccccc',
  bg: '#f5f5f5',
  green: '#166534',
  red: '#991b1b',
  blue: '#1e3a5f',
}

const pdf = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 40, fontFamily: 'Helvetica', fontSize: 9, color: C.black },
  // Header
  header: { marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.blue },
  appName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.blue },
  reportTitle: { fontSize: 10, color: C.gray, marginTop: 2 },
  generated: { fontSize: 8, color: C.lightGray, marginTop: 4 },
  // Info row
  infoRow: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.lightGray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  // Section
  section: { marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.blue },
  sectionSub: { fontSize: 8, color: C.gray },
  // Table
  tableHead: { flexDirection: 'row', backgroundColor: C.bg, paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: C.border, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRow: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: '#fafafa' },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.gray },
  td: { fontSize: 8 },
  emptyRow: { paddingVertical: 8, paddingHorizontal: 6 },
  emptyText: { fontSize: 8, color: C.lightGray, fontStyle: 'italic' },
  // Totals bar
  totalsRow: { flexDirection: 'row', backgroundColor: C.bg, paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: C.border, marginTop: -0.5 },
  totalsLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, flex: 1 },
  totalsValue: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  // Summary checklist
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  checkBox: { width: 12, height: 12, borderRadius: 6, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkMark: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  checkLabel: { flex: 1, fontSize: 9 },
  checkValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Signature block
  sigSection: { marginTop: 20 },
  sigTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  sigRow: { flexDirection: 'row', gap: 30, marginBottom: 20 },
  sigBox: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: C.black, marginBottom: 3, height: 28 },
  sigLabel: { fontSize: 7.5, color: C.gray },
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: C.lightGray },
})

function LogDocument({ driver, supervisors, sessions, progress }) {
  const supervisorLookup = (id) => supervisors.find(s => s.id === id) ?? null

  const obsSessions = sessions
    .filter(s => s.logType === LOG_TYPES.DL91B_OBSERVATION)
    .sort((a, b) => a.date.localeCompare(b.date))

  const instrSessions = sessions
    .filter(s => s.logType === LOG_TYPES.DL91B_INSTRUCTION)
    .sort((a, b) => a.date.localeCompare(b.date))

  const practiceSessions = sessions
    .filter(s => s.logType === LOG_TYPES.PRACTICE_30HR)
    .sort((a, b) => a.date.localeCompare(b.date))

  const today = new Date()
  const calendarDaysMet = progress.earliestTestDate ? today >= progress.earliestTestDate : false
  const daysElapsed = progress.firstSessionDate
    ? Math.floor((today - new Date(progress.firstSessionDate)) / 86400000)
    : 0

  return (
    <Document title={`${driver.fullName} — Driving Log`} author="LicenseBound">
      <Page size="LETTER" style={pdf.page}>

        {/* Header */}
        <View style={pdf.header}>
          <Text style={pdf.appName}>LicenseBound</Text>
          <Text style={pdf.reportTitle}>Texas Graduated Driver License — Practice Log Report</Text>
          <Text style={pdf.generated}>Generated {formatDate(today)} · Data is self-reported; verify accuracy before DPS submission.</Text>
        </View>

        {/* Driver info */}
        <View style={pdf.infoRow}>
          <View style={pdf.infoBox}>
            <Text style={pdf.infoLabel}>Driver</Text>
            <Text style={pdf.infoValue}>{driver.fullName}</Text>
          </View>
          <View style={pdf.infoBox}>
            <Text style={pdf.infoLabel}>License Number</Text>
            <Text style={pdf.infoValue}>{driver.licenseNumber}</Text>
          </View>
          <View style={pdf.infoBox}>
            <Text style={pdf.infoLabel}>License Issued</Text>
            <Text style={pdf.infoValue}>{driver.licenseIssueDate ? formatDate(new Date(driver.licenseIssueDate + 'T12:00:00')) : '—'}</Text>
          </View>
          <View style={pdf.infoBox}>
            <Text style={pdf.infoLabel}>First Session</Text>
            <Text style={pdf.infoValue}>{progress.firstSessionDate ? formatDate(new Date(progress.firstSessionDate + 'T12:00:00')) : '—'}</Text>
          </View>
        </View>

        {/* ── DL-91B Observation ── */}
        <SessionTable
          title="DL-91B — Observation Log"
          subtitle={`Required: 7 hours  ·  Logged: ${formatMinutes(progress.dl91bObs)}`}
          sessions={obsSessions}
          supervisorLookup={supervisorLookup}
          showNight={false}
          total={progress.dl91bObs}
        />

        {/* ── DL-91B Instruction ── */}
        <SessionTable
          title="DL-91B — Instruction Log"
          subtitle={`Required: 7 hours  ·  Logged: ${formatMinutes(progress.dl91bInstr)}`}
          sessions={instrSessions}
          supervisorLookup={supervisorLookup}
          showNight={false}
          total={progress.dl91bInstr}
        />

        {/* ── 30-Hour Practice ── */}
        <SessionTable
          title="30-Hour Practice Log"
          subtitle={`Required: 30 hours total, 10 hours at night  ·  Logged: ${formatMinutes(progress.thirtyHr)} total / ${formatMinutes(progress.nightHrs)} night`}
          sessions={practiceSessions}
          supervisorLookup={supervisorLookup}
          showNight={true}
          total={progress.thirtyHr}
          nightTotal={progress.nightHrs}
        />

        {/* ── Requirements Summary ── */}
        <View style={pdf.section}>
          <View style={pdf.sectionHeader}>
            <Text style={pdf.sectionTitle}>Requirements Summary</Text>
          </View>

          <CheckRow label="DL-91B Observation (7 hrs)" value={formatMinutes(progress.dl91bObs)} met={progress.dl91bObs >= progress.dl91bObsTarget} />
          <CheckRow label="DL-91B Instruction (7 hrs)" value={formatMinutes(progress.dl91bInstr)} met={progress.dl91bInstr >= progress.dl91bInstrTarget} />
          <CheckRow label="30-Hour Practice (30 hrs)" value={formatMinutes(progress.thirtyHr)} met={progress.thirtyHr >= progress.thirtyHrTarget} />
          <CheckRow label="Night Hours (10 hrs min)" value={formatMinutes(progress.nightHrs)} met={progress.nightHrs >= progress.nightHrsTarget} />
          <CheckRow
            label={`44-Day Minimum (${daysElapsed} days elapsed)`}
            value={progress.earliestTestDate ? `Earliest test: ${formatDate(progress.earliestTestDate)}` : '—'}
            met={calendarDaysMet}
          />
        </View>

        {/* ── Signature Block ── */}
        <View style={pdf.sigSection}>
          <Text style={pdf.sigTitle}>Certification</Text>
          <Text style={{ fontSize: 8, color: C.gray, marginBottom: 16 }}>
            I certify that the information above is accurate and that all practice sessions were
            conducted in accordance with Texas Transportation Code requirements.
          </Text>

          <View style={pdf.sigRow}>
            <View style={pdf.sigBox}>
              <View style={pdf.sigLine} />
              <Text style={pdf.sigLabel}>Parent / Guardian Supervisor Signature</Text>
            </View>
            <View style={[pdf.sigBox, { maxWidth: 120 }]}>
              <View style={pdf.sigLine} />
              <Text style={pdf.sigLabel}>Date</Text>
            </View>
          </View>

          <View style={pdf.sigRow}>
            <View style={pdf.sigBox}>
              <View style={pdf.sigLine} />
              <Text style={pdf.sigLabel}>Teen Driver Signature</Text>
            </View>
            <View style={[pdf.sigBox, { maxWidth: 120 }]}>
              <View style={pdf.sigLine} />
              <Text style={pdf.sigLabel}>Date</Text>
            </View>
          </View>
        </View>

        <Text style={pdf.footer}>
          LicenseBound · licensebound.app · This is a self-reported practice log, not an official DPS document.
        </Text>
      </Page>
    </Document>
  )
}

function SessionTable({ title, subtitle, sessions, supervisorLookup, showNight, total, nightTotal }) {
  // For 30-hr table: compute day/night totals from raw session data
  const totalNightMinutes = showNight
    ? sessions.reduce((sum, s) => sum + (s.nightMinutes ?? 0), 0)
    : 0
  const totalDayMinutes = showNight
    ? sessions.reduce((sum, s) => sum + Math.max(0, s.totalMinutes - (s.nightMinutes ?? 0)), 0)
    : 0

  return (
    <View style={pdf.section}>
      <View style={pdf.sectionHeader}>
        <Text style={pdf.sectionTitle}>{title}</Text>
        <Text style={pdf.sectionSub}>{subtitle}</Text>
      </View>

      {/* Table header */}
      <View style={pdf.tableHead}>
        <Text style={[pdf.th, { flex: 2 }]}>Date</Text>
        <Text style={[pdf.th, { flex: 3 }]}>Supervisor / License</Text>
        <Text style={[pdf.th, { flex: 1.5 }]}>Start</Text>
        <Text style={[pdf.th, { flex: 1.5 }]}>End</Text>
        {showNight ? (
          <>
            <Text style={[pdf.th, { flex: 1.5, textAlign: 'right' }]}>Day Hours</Text>
            <Text style={[pdf.th, { flex: 1.5, textAlign: 'right' }]}>Night Hours</Text>
          </>
        ) : (
          <Text style={[pdf.th, { flex: 1.5, textAlign: 'right' }]}>Duration</Text>
        )}
      </View>

      {sessions.length === 0 ? (
        <View style={pdf.emptyRow}>
          <Text style={pdf.emptyText}>No sessions logged.</Text>
        </View>
      ) : (
        sessions.map((s, i) => {
          const sup = supervisorLookup(s.supervisorId)
          const nightMins = s.nightMinutes ?? 0
          const dayMins = Math.max(0, s.totalMinutes - nightMins)
          return (
            <View key={s.sessionId} style={[pdf.tableRow, { alignItems: 'flex-start' }, i % 2 === 1 ? pdf.tableRowAlt : {}]}>
              <Text style={[pdf.td, { flex: 2 }]}>{formatDate(new Date(s.date + 'T12:00:00'))}</Text>
              <View style={{ flex: 3 }}>
                <Text style={pdf.td}>{sup?.fullName ?? '—'}</Text>
                {sup?.licenseNumber && (
                  <Text style={[pdf.td, { fontSize: 7, color: C.lightGray, marginTop: 1 }]}>
                    Lic: {sup.licenseNumber}
                  </Text>
                )}
              </View>
              <Text style={[pdf.td, { flex: 1.5 }]}>{formatTime(new Date(s.startTime))}</Text>
              <Text style={[pdf.td, { flex: 1.5 }]}>{formatTime(new Date(s.endTime))}</Text>
              {showNight ? (
                <>
                  <Text style={[pdf.td, { flex: 1.5, textAlign: 'right' }]}>
                    {dayMins > 0 ? formatMinutes(dayMins) : '—'}
                  </Text>
                  <Text style={[pdf.td, { flex: 1.5, textAlign: 'right' }]}>
                    {nightMins > 0 ? formatMinutes(nightMins) : '—'}
                  </Text>
                </>
              ) : (
                <Text style={[pdf.td, { flex: 1.5, textAlign: 'right' }]}>{formatMinutes(s.totalMinutes)}</Text>
              )}
            </View>
          )
        })
      )}

      {/* Totals */}
      <View style={pdf.totalsRow}>
        <Text style={[pdf.totalsLabel, { flex: 8 }]}>
          Total ({sessions.length} session{sessions.length !== 1 ? 's' : ''})
        </Text>
        {showNight ? (
          <>
            <Text style={[pdf.totalsValue, { flex: 1.5, textAlign: 'right' }]}>{formatMinutes(totalDayMinutes)}</Text>
            <Text style={[pdf.totalsValue, { flex: 1.5, textAlign: 'right' }]}>{formatMinutes(totalNightMinutes)}</Text>
          </>
        ) : (
          <Text style={[pdf.totalsValue, { flex: 1.5, textAlign: 'right' }]}>{formatMinutes(total)}</Text>
        )}
      </View>
    </View>
  )
}

function CheckRow({ label, value, met }) {
  return (
    <View style={pdf.checkRow}>
      <View style={[pdf.checkBox, { backgroundColor: met ? '#16a34a' : '#d1d5db' }]}>
        <Text style={pdf.checkMark}>{met ? '✓' : '○'}</Text>
      </View>
      <Text style={pdf.checkLabel}>{label}</Text>
      <Text style={[pdf.checkValue, { color: met ? C.green : C.gray }]}>{value}</Text>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function PDFExport() {
  const navigate = useNavigate()
  const { familyId } = useAuthStore()
  const { drivers, supervisors, selectedDriverId, loadProfiles } = useProfileStore()
  const { loadSessions, getSessionsForDriver } = useSessionStore()

  useEffect(() => {
    if (familyId) loadProfiles(familyId)
  }, [familyId])

  useEffect(() => {
    if (familyId && selectedDriverId) {
      loadSessions(familyId, selectedDriverId)
    }
  }, [familyId, selectedDriverId])

  const driver = drivers.find(d => d.id === selectedDriverId)
  const sessions = getSessionsForDriver(selectedDriverId)
  const progress = useMemo(() => getProgress(sessions), [sessions])

  const fileName = driver
    ? `${driver.fullName.replace(/\s+/g, '_')}_driving_log.pdf`
    : 'driving_log.pdf'

  if (!driver) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <header className="flex items-center gap-2 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Export PDF</h1>
        </header>
        <p className="text-sm text-muted-foreground text-center mt-8">
          No driver selected. Go to Profiles to set up your driver.
        </p>
        <Button variant="outline" onClick={() => navigate('/profiles')}>Go to Profiles</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Export PDF</h1>
      </header>

      {/* Preview card */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div>
            <p className="font-medium">{driver.fullName}</p>
            <p className="text-xs text-muted-foreground">License: {driver.licenseNumber}</p>
          </div>

          <Separator />

          <StatRow icon={<Clock size={14} />} label="DL-91B Observation" value={`${formatMinutes(progress.dl91bObs)} / 7h`} met={progress.dl91bObs >= progress.dl91bObsTarget} />
          <StatRow icon={<Clock size={14} />} label="DL-91B Instruction" value={`${formatMinutes(progress.dl91bInstr)} / 7h`} met={progress.dl91bInstr >= progress.dl91bInstrTarget} />
          <StatRow icon={<Clock size={14} />} label="30-Hour Practice" value={`${formatMinutes(progress.thirtyHr)} / 30h`} met={progress.thirtyHr >= progress.thirtyHrTarget} />
          <StatRow icon={<Moon size={14} />} label="Night hours" value={`${formatMinutes(progress.nightHrs)} / 10h`} met={progress.nightHrs >= progress.nightHrsTarget} />

          <Separator />

          <p className="text-xs text-muted-foreground">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} will be included in the export.
          </p>
        </CardContent>
      </Card>

      <PDFDownloadLink
        document={
          <LogDocument
            driver={driver}
            supervisors={supervisors}
            sessions={sessions}
            progress={progress}
          />
        }
        fileName={fileName}
      >
        {({ loading, error }) => (
          <Button
            size="lg"
            className="w-full gap-2 mt-1"
            disabled={loading || !!error}
          >
            <FileDown size={18} />
            {loading ? 'Preparing PDF…' : error ? 'Error generating PDF' : 'Download PDF'}
          </Button>
        )}
      </PDFDownloadLink>

      <p className="text-xs text-muted-foreground text-center px-4">
        The PDF includes all logged sessions, totals, and a signature block.
        It is a self-reported log — not an official DPS form.
      </p>
    </div>
  )
}

function StatRow({ icon, label, value, met }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className={`flex items-center gap-2 ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
        {icon}
        <span>{label}</span>
      </div>
      <span className={`font-medium ${met ? 'text-green-600 dark:text-green-400' : ''}`}>{value}</span>
    </div>
  )
}
