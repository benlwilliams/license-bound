import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import useProfileStore from '@/store/profileStore'
import DriverCard from '@/components/profiles/DriverCard'
import SupervisorCard from '@/components/profiles/SupervisorCard'
import DriverForm from '@/components/profiles/DriverForm'
import SupervisorForm from '@/components/profiles/SupervisorForm'
import ConfirmDialog from '@/components/common/ConfirmDialog'

export default function Profiles() {
  const { familyId } = useAuthStore()
  const {
    drivers, supervisors, loading,
    loadProfiles, saveDriver, deleteDriver,
    saveSupervisor, deleteSupervisor,
    selectedDriverId, selectedSupervisorId,
    setSelectedDriver, setSelectedSupervisor,
  } = useProfileStore()

  const [driverSheet, setDriverSheet] = useState(false)
  const [supervisorSheet, setSupervisorSheet] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [editingSupervisor, setEditingSupervisor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteDriver_, setDeleteDriver_] = useState(null)
  const [deleteSupervisor_, setDeleteSupervisor_] = useState(null)

  useEffect(() => {
    if (familyId) loadProfiles(familyId)
  }, [familyId])

  // ── Driver handlers ────────────────────────────────────────────────────────

  function openAddDriver() {
    setEditingDriver(null)
    setDriverSheet(true)
  }

  function openEditDriver(driver) {
    setEditingDriver(driver)
    setDriverSheet(true)
  }

  async function handleSaveDriver(values) {
    setSaving(true)
    try {
      const payload = editingDriver
        ? { ...editingDriver, ...values }
        : { ...values, familyId }
      await saveDriver(familyId, payload)
      setDriverSheet(false)
      toast.success(editingDriver ? 'Driver updated' : 'Driver added')
    } catch (err) {
      console.error('Save driver error:', err)
      toast.error('Failed to save driver')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDriver() {
    try {
      await deleteDriver(familyId, deleteDriver_.id)
      toast.success('Driver removed')
    } catch {
      toast.error('Failed to remove driver')
    } finally {
      setDeleteDriver_(null)
    }
  }

  // ── Supervisor handlers ────────────────────────────────────────────────────

  function openAddSupervisor() {
    setEditingSupervisor(null)
    setSupervisorSheet(true)
  }

  function openEditSupervisor(supervisor) {
    setEditingSupervisor(supervisor)
    setSupervisorSheet(true)
  }

  async function handleSaveSupervisor(values) {
    setSaving(true)
    try {
      const payload = editingSupervisor
        ? { ...editingSupervisor, ...values }
        : { ...values, familyId }
      await saveSupervisor(familyId, payload)
      setSupervisorSheet(false)
      toast.success(editingSupervisor ? 'Supervisor updated' : 'Supervisor added')
    } catch (err) {
      console.error('Save supervisor error:', err)
      toast.error('Failed to save supervisor')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSupervisor() {
    try {
      await deleteSupervisor(familyId, deleteSupervisor_.id)
      toast.success('Supervisor removed')
    } catch {
      toast.error('Failed to remove supervisor')
    } finally {
      setDeleteSupervisor_(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Profiles</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Tap a card to select it as the active driver or supervisor.
        </p>
      </header>

      {/* ── Drivers ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-muted-foreground" />
            <h2 className="font-semibold">Drivers</h2>
          </div>
          <Button size="sm" variant="outline" onClick={openAddDriver} className="gap-1.5">
            <Plus size={14} />
            Add driver
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : drivers.length === 0 ? (
          <EmptyState
            message="No drivers yet. Add your teen driver to get started."
            onAdd={openAddDriver}
            addLabel="Add first driver"
          />
        ) : (
          <div className="space-y-2">
            {drivers.map(driver => (
              <DriverCard
                key={driver.id}
                driver={driver}
                selected={driver.id === selectedDriverId}
                onSelect={() => setSelectedDriver(driver.id)}
                onEdit={() => openEditDriver(driver)}
                onDelete={() => setDeleteDriver_({ id: driver.id, name: driver.fullName })}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* ── Supervisors ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-muted-foreground" />
            <h2 className="font-semibold">Supervisors</h2>
          </div>
          <Button size="sm" variant="outline" onClick={openAddSupervisor} className="gap-1.5">
            <Plus size={14} />
            Add supervisor
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : supervisors.length === 0 ? (
          <EmptyState
            message="Add at least one supervisor — the adult who will ride along during practice sessions."
            onAdd={openAddSupervisor}
            addLabel="Add first supervisor"
          />
        ) : (
          <div className="space-y-2">
            {supervisors.map(supervisor => (
              <SupervisorCard
                key={supervisor.id}
                supervisor={supervisor}
                selected={supervisor.id === selectedSupervisorId}
                onSelect={() => setSelectedSupervisor(supervisor.id)}
                onEdit={() => openEditSupervisor(supervisor)}
                onDelete={() => setDeleteSupervisor_({ id: supervisor.id, name: supervisor.fullName })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Driver sheet ── */}
      <Sheet open={driverSheet} onOpenChange={setDriverSheet}>
        <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{editingDriver ? 'Edit driver' : 'Add driver'}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <DriverForm
              initial={editingDriver}
              onSave={handleSaveDriver}
              onCancel={() => setDriverSheet(false)}
              saving={saving}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ── Supervisor sheet ── */}
      <Sheet open={supervisorSheet} onOpenChange={setSupervisorSheet}>
        <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{editingSupervisor ? 'Edit supervisor' : 'Add supervisor'}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <SupervisorForm
              initial={editingSupervisor}
              onSave={handleSaveSupervisor}
              onCancel={() => setSupervisorSheet(false)}
              saving={saving}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ── Delete confirms ── */}
      <ConfirmDialog
        open={!!deleteDriver_}
        onOpenChange={open => !open && setDeleteDriver_(null)}
        title={`Remove ${deleteDriver_?.name}?`}
        description="This will also remove all their logged sessions. This cannot be undone."
        confirmLabel="Remove driver"
        destructive
        onConfirm={handleDeleteDriver}
      />
      <ConfirmDialog
        open={!!deleteSupervisor_}
        onOpenChange={open => !open && setDeleteSupervisor_(null)}
        title={`Remove ${deleteSupervisor_?.name}?`}
        description="Past sessions that used this supervisor will keep their record."
        confirmLabel="Remove supervisor"
        destructive
        onConfirm={handleDeleteSupervisor}
      />
    </div>
  )
}

function EmptyState({ message, onAdd, addLabel }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onAdd}>{addLabel}</Button>
    </div>
  )
}
