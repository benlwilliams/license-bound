import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Clock, FileText, Settings, Car } from 'lucide-react'
import useSessionStore from '@/store/sessionStore'

const leftTabs = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/history', label: 'History', Icon: Clock },
]

const rightTabs = [
  { to: '/readiness', label: 'Ready?', Icon: FileText },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

function Tab({ to, label, Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`
      }
    >
      <Icon size={22} strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeSession = useSessionStore(s => s.activeSession)

  const onLiveSession = location.pathname === '/session/live'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-pb">
      <div className="max-w-md mx-auto flex items-stretch">
        {leftTabs.map(tab => <Tab key={tab.to} {...tab} />)}

        {activeSession && (
          <div className="relative flex-1 flex items-center justify-center">
            <button
              onClick={() => !onLiveSession && navigate('/session/live')}
              className="absolute -translate-y-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center border-4 border-background active:scale-95 transition-transform"
              aria-label="Return to active drive"
            >
              <Car size={22} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {rightTabs.map(tab => <Tab key={tab.to} {...tab} />)}
      </div>
    </nav>
  )
}
