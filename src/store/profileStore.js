import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDrivers, getSupervisors, saveDriver, saveSupervisor, deleteDriver, deleteSupervisor } from '@/firebase/firestore'

const useProfileStore = create(
  persist(
    (set, get) => ({
      drivers: [],
      supervisors: [],
      selectedDriverId: null,
      selectedSupervisorId: null,
      loading: false,
      error: null,

      // ── Load ────────────────────────────────────────────────────────────────

      loadProfiles: async (familyId) => {
        set({ loading: true, error: null })
        try {
          const [drivers, supervisors] = await Promise.all([
            getDrivers(familyId),
            getSupervisors(familyId),
          ])
          set({ drivers, supervisors, loading: false })

          // Auto-select if only one exists and nothing selected yet
          const { selectedDriverId, selectedSupervisorId } = get()
          if (!selectedDriverId && drivers.length === 1) {
            set({ selectedDriverId: drivers[0].id })
          }
          if (!selectedSupervisorId && supervisors.length === 1) {
            set({ selectedSupervisorId: supervisors[0].id })
          }
        } catch (err) {
          set({ loading: false, error: err.message })
        }
      },

      // ── Drivers ─────────────────────────────────────────────────────────────

      saveDriver: async (familyId, driver) => {
        const id = await saveDriver(familyId, driver)
        const updated = { ...driver, id }
        set((state) => ({
          drivers: state.drivers.some(d => d.id === id)
            ? state.drivers.map(d => d.id === id ? updated : d)
            : [...state.drivers, updated],
        }))
        return id
      },

      deleteDriver: async (familyId, driverId) => {
        await deleteDriver(familyId, driverId)
        set((state) => ({
          drivers: state.drivers.filter(d => d.id !== driverId),
          selectedDriverId: state.selectedDriverId === driverId ? null : state.selectedDriverId,
        }))
      },

      setSelectedDriver: (id) => set({ selectedDriverId: id }),

      // ── Supervisors ─────────────────────────────────────────────────────────

      saveSupervisor: async (familyId, supervisor) => {
        const id = await saveSupervisor(familyId, supervisor)
        const updated = { ...supervisor, id }
        set((state) => ({
          supervisors: state.supervisors.some(s => s.id === id)
            ? state.supervisors.map(s => s.id === id ? updated : s)
            : [...state.supervisors, updated],
        }))
        return id
      },

      deleteSupervisor: async (familyId, supervisorId) => {
        await deleteSupervisor(familyId, supervisorId)
        set((state) => ({
          supervisors: state.supervisors.filter(s => s.id !== supervisorId),
          selectedSupervisorId: state.selectedSupervisorId === supervisorId ? null : state.selectedSupervisorId,
        }))
      },

      setSelectedSupervisor: (id) => set({ selectedSupervisorId: id }),

      // ── Getters ─────────────────────────────────────────────────────────────

      getSelectedDriver: () => {
        const { drivers, selectedDriverId } = get()
        return drivers.find(d => d.id === selectedDriverId) ?? null
      },

      getSelectedSupervisor: () => {
        const { supervisors, selectedSupervisorId } = get()
        return supervisors.find(s => s.id === selectedSupervisorId) ?? null
      },
    }),
    {
      name: 'licensebound-profiles',
      partialize: (state) => ({
        drivers: state.drivers,
        supervisors: state.supervisors,
        selectedDriverId: state.selectedDriverId,
        selectedSupervisorId: state.selectedSupervisorId,
      }),
    }
  )
)

export default useProfileStore
