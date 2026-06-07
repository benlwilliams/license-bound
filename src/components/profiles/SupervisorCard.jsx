import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'

export default function SupervisorCard({ supervisor, selected, onSelect, onEdit, onDelete }) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
    >
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {selected && <CheckCircle2 size={16} className="text-primary shrink-0" />}
            <div className="min-w-0">
              <p className="font-medium truncate">{supervisor.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {supervisor.relationship}
              </p>
              <p className="text-xs text-muted-foreground">
                License: {supervisor.licenseNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={e => { e.stopPropagation(); onEdit() }}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={e => { e.stopPropagation(); onDelete() }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
