import { create } from 'zustand'
import { onAuthChange } from '@/firebase/auth'

const useAuthStore = create((set) => ({
  user: null,
  familyId: null,
  loading: true,

  initAuth: () => {
    const unsubscribe = onAuthChange((user) => {
      set({
        user,
        familyId: user?.uid ?? null,
        loading: false,
      })
    })
    return unsubscribe
  },
}))

export default useAuthStore
