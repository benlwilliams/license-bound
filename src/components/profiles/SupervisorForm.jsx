import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateSupervisor } from '@/utils/validation'

const EMPTY = {
  fullName: '',
  licenseNumber: '',
  relationship: '',
  confirmedAge: false,
}

export default function SupervisorForm({ initial, onSave, onCancel, saving }) {
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
    const errs = validateSupervisor(values)
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="sup-name">Full legal name</Label>
        <Input
          id="sup-name"
          value={values.fullName}
          onChange={e => set('fullName', e.target.value)}
          placeholder="John Smith"
        />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sup-license">Driver's license number</Label>
        <Input
          id="sup-license"
          value={values.licenseNumber}
          onChange={e => set('licenseNumber', e.target.value)}
          placeholder="TX license number"
          autoCapitalize="characters"
        />
        {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sup-relationship">Relationship to driver</Label>
        <Input
          id="sup-relationship"
          value={values.relationship}
          onChange={e => set('relationship', e.target.value)}
          placeholder="e.g. Parent, Grandparent, Uncle"
        />
        {errors.relationship && <p className="text-xs text-destructive">{errors.relationship}</p>}
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.confirmedAge}
            onChange={e => set('confirmedAge', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm leading-snug">
            I confirm this supervisor is 21 or older and has held a valid driver's license for at least 1 year.
          </span>
        </label>
        {errors.confirmedAge && <p className="text-xs text-destructive">{errors.confirmedAge}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Saving…' : 'Save supervisor'}
        </Button>
      </div>
    </form>
  )
}
