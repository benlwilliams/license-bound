import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateDriver } from '@/utils/validation'

const EMPTY = {
  fullName: '',
  licenseNumber: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
}

export default function DriverForm({ initial, onSave, onCancel, saving }) {
  const [values, setValues] = useState(initial ?? EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setValues(initial ?? EMPTY)
    setErrors({})
  }, [initial])

  function set(field, value) {
    setValues(v => ({ ...v, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validateDriver(values)
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="drv-name">Full legal name</Label>
        <Input
          id="drv-name"
          value={values.fullName}
          onChange={e => set('fullName', e.target.value)}
          placeholder="Jane Smith"
        />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="drv-license">Learner license number</Label>
        <Input
          id="drv-license"
          value={values.licenseNumber}
          onChange={e => set('licenseNumber', e.target.value)}
          placeholder="TX license number"
          autoCapitalize="characters"
        />
        {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="drv-issue">Issue date</Label>
          <Input
            id="drv-issue"
            type="date"
            value={values.licenseIssueDate}
            onChange={e => set('licenseIssueDate', e.target.value)}
          />
          {errors.licenseIssueDate && <p className="text-xs text-destructive">{errors.licenseIssueDate}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="drv-expiry">Expiry date</Label>
          <Input
            id="drv-expiry"
            type="date"
            value={values.licenseExpiryDate}
            onChange={e => set('licenseExpiryDate', e.target.value)}
          />
          {errors.licenseExpiryDate && <p className="text-xs text-destructive">{errors.licenseExpiryDate}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Saving…' : 'Save driver'}
        </Button>
      </div>
    </form>
  )
}
