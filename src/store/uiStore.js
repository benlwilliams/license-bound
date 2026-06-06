import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUiStore = create(
  persist(
    (set, get) => ({
      darkMode: false,
      isOffline: false,

      toggleDarkMode: () => {
        const next = !get().darkMode
        set({ darkMode: next })
        document.documentElement.classList.toggle('dark', next)
      },

      setDarkMode: (value) => {
        set({ darkMode: value })
        document.documentElement.classList.toggle('dark', value)
      },

      setOffline: (value) => set({ isOffline: value }),
    }),
    {
      name: 'licensebound-ui',
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
)

export default useUiStore
