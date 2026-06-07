import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/utils/dateTime'
import { LICENSE_EXPIRY_WARNING_DAYS } from '@/utils/constants'

export default function DriverCard({ driver, selected, onSelect, onEdit, onDelete }) {
  const expiry = driver.licenseExpiryDate ? new Date(driver.licenseExpiryDate) : null
  const today = new Date()
  const daysUntilExpiry = expiry
    ? Math.floor((expiry - today) / (1000 * 60 * 60 * 24))
    : null
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= LICENSE_EXPIRY_WARNING_DAYS
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0

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
              <p className="font-medium truncate">{driver.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                License: {driver.licenseNumber}
              </p>
              {expiry && (
                <p className={`text-xs mt-0.5 ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                  {isExpired
                    ? `Expired ${formatDate(expiry)}`
                    : `Expires ${formatDate(expiry)}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isExpiringSoon && !isExpired && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-400 text-xs px-1.5 py-0">
                Expiring soon
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                Expired
              </Badge>
            )}
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
