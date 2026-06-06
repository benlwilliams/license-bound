export function validateDriver(values) {
  const errors = {}
  if (!values.fullName?.trim()) errors.fullName = 'Full name is required'
  if (!values.licenseNumber?.trim()) errors.licenseNumber = 'License number is required'
  if (!values.licenseIssueDate) errors.licenseIssueDate = 'Issue date is required'
  if (!values.licenseExpiryDate) errors.licenseExpiryDate = 'Expiry date is required'
  if (values.licenseIssueDate && values.licenseExpiryDate) {
    if (new Date(values.licenseExpiryDate) <= new Date(values.licenseIssueDate)) {
      errors.licenseExpiryDate = 'Expiry must be after issue date'
    }
  }
  return errors
}

export function validateSupervisor(values) {
  const errors = {}
  if (!values.fullName?.trim()) errors.fullName = 'Full name is required'
  if (!values.licenseNumber?.trim()) errors.licenseNumber = 'License number is required'
  if (!values.relationship?.trim()) errors.relationship = 'Relationship is required'
  if (!values.confirmedAge) errors.confirmedAge = 'Must confirm supervisor is 21+ and has held license 1+ year'
  return errors
}

export function validateManualSession(values) {
  const errors = {}
  if (!values.driverId) errors.driverId = 'Select a driver'
  if (!values.supervisorId) errors.supervisorId = 'Select a supervisor'
  if (!values.logType) errors.logType = 'Select a log type'
  if (!values.date) errors.date = 'Date is required'
  if (!values.startTime) errors.startTime = 'Start time is required'
  if (!values.endTime) errors.endTime = 'End time is required'
  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errors.endTime = 'End time must be after start time'
  }
  return errors
}
