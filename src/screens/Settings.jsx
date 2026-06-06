import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { LogOut, Users, FileDown, Upload } from 'lucide-react'
import useUiStore from '@/store/uiStore'
import useAuthStore from '@/store/authStore'
import { signOut } from '@/firebase/auth'

export default function Settings() {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useUiStore()
  const { user } = useAuthStore()

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Dark mode */}
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-base cursor-pointer">Dark mode</Label>
            <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          <Separator />

          {/* Manage profiles */}
          <button
            onClick={() => navigate('/profiles')}
            className="flex items-center gap-3 w-full text-left hover:text-foreground text-sm py-1 transition-colors"
          >
            <Users size={18} className="text-muted-foreground" />
            <span>Manage drivers &amp; supervisors</span>
          </button>

          <Separator />

          {/* Export PDF */}
          <button
            onClick={() => navigate('/export')}
            className="flex items-center gap-3 w-full text-left hover:text-foreground text-sm py-1 transition-colors"
          >
            <FileDown size={18} className="text-muted-foreground" />
            <span>Export practice log PDF</span>
          </button>

          <Separator />

          {/* Import from paper log */}
          <button
            onClick={() => navigate('/import')}
            className="flex items-center gap-3 w-full text-left hover:text-foreground text-sm py-1 transition-colors"
          >
            <Upload size={18} className="text-muted-foreground" />
            <span>Import from paper log</span>
          </button>

          <Separator />

          {/* Account */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut size={15} />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
