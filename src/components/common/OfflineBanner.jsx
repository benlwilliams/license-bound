import useUiStore from '@/store/uiStore'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const isOffline = useUiStore(s => s.isOffline)

  if (!isOffline) return null

  return (
    <div className="bg-yellow-500/90 text-yellow-950 text-sm font-medium px-4 py-2 flex items-center gap-2 justify-center">
      <WifiOff size={15} />
      Offline — sessions will sync when you reconnect
    </div>
  )
}
