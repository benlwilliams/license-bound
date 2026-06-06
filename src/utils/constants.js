export const LOG_TYPES = {
  DL91B_OBSERVATION: 'dl91b-observation',
  DL91B_INSTRUCTION: 'dl91b-instruction',
  PRACTICE_30HR: 'practice-30hr',
}

export const LOG_TYPE_LABELS = {
  [LOG_TYPES.DL91B_OBSERVATION]: 'DL-91B Observation',
  [LOG_TYPES.DL91B_INSTRUCTION]: 'DL-91B Instruction',
  [LOG_TYPES.PRACTICE_30HR]: '30-Hour Practice',
}

// DL-91B daily caps (per parenttaught.com)
export const DL91B_DAILY_MAX_MINUTES = 4 * 60        // 4 hours total per day
export const DL91B_DAILY_INSTRUCTION_MAX = 2 * 60    // 2 hours instruction per day
export const DL91B_OBSERVATION_TARGET = 7 * 60       // 7 hours total target
export const DL91B_INSTRUCTION_TARGET = 7 * 60       // 7 hours total target

// 30-Hour log caps
export const THIRTY_HR_DAILY_MAX_MINUTES = 2 * 60    // 2 hours per day
export const THIRTY_HR_TARGET = 30 * 60              // 30 hours total target
export const THIRTY_HR_NIGHT_TARGET = 10 * 60        // 10 hours night minimum

// Night window offsets in minutes
export const NIGHT_OFFSET_MINUTES = 30               // 30 min after sunset / before sunrise

// Driving window (teen may only drive between 5AM and 11PM)
export const DRIVE_WINDOW_START_HOUR = 5             // 5:00 AM
export const DRIVE_WINDOW_END_HOUR = 23              // 11:00 PM

// 44-day minimum before road test
export const MIN_CALENDAR_DAYS = 44

// Expiration warning threshold
export const LICENSE_EXPIRY_WARNING_DAYS = 60

// GPS sampling interval in milliseconds
export const GPS_SAMPLE_INTERVAL_MS = 5000           // every 5 seconds
// Downsample threshold — beyond this many points, sample every 15s instead
export const GPS_DOWNSAMPLE_THRESHOLD = 720
