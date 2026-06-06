import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'

// ── DL-91B prompt ──────────────────────────────────────────────────────────────
// Form columns: Date | Time (start–end) | Duration | Type (obs vs instr per row)
//               | Official Parent Instructor & Driver License Number

const DL91B_PROMPT = `You are extracting driving log entries from a photograph of a Texas DL-91B Parent-Taught Driver Education log.

The form has rows with these columns:
- Date (e.g. "3/15/24" or "03/15/2024")
- Time span (e.g. "9:00AM–11:00AM" or "9:00–11:00")
- Duration (calculated hours — may be handwritten)
- A column or checkbox indicating whether the row is Observation time or Instruction time
- Official Parent Instructor's name and Driver License Number (e.g. "John Smith TX12345678")

Extract every completed row and return a JSON array wrapped in <sessions> tags exactly like this:

<sessions>
[
  {
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "logType": "dl91b-observation",
    "supervisorLicense": "TX12345678",
    "confidence": "high",
    "issues": ""
  }
]
</sessions>

Rules:
- Skip rows that are blank or clearly unused
- Normalize dates to YYYY-MM-DD. Two-digit years like "24" become "2024"
- Normalize all times to HH:MM 24-hour format ("9:00AM" → "09:00", "2:30PM" → "14:30")
- logType must be exactly "dl91b-observation" or "dl91b-instruction" — look at which column or checkbox is filled for that row
- supervisorLicense: extract only the license number (strip name, spaces, slashes). If name and number cannot be separated, include the full text in issues and set confidence to "low"
- confidence: "high" for clear legible entries; "medium" for minor ambiguity; "low" for illegible handwriting, missing required fields, or ambiguous log type
- issues: describe any problem (illegible date, unclear type, etc.) or empty string if none
- Return [] if no sessions are found`

// ── 30-Hour Practice Log prompt ────────────────────────────────────────────────
// Form columns: Date | Time | Daytime Hours | Nighttime Hours | Adult Initials and DL#

const PRACTICE_30HR_PROMPT = `You are extracting driving log entries from a photograph of a Texas 30-Hour Practice Driving Log.

The form has rows with these columns:
- Date (e.g. "3/15/24")
- Time (start and end, e.g. "9:00 – 11:00 AM" or "9:00 IN / 11:00 OUT")
- Daytime Hours (decimal or H:MM, e.g. "1.5" or "1:30")
- Night Hours (decimal or H:MM, e.g. "0.5" or "0:30")
- Adult Supervisor's Initials and DL# (e.g. "JS / TX12345678")

Extract every completed row and return a JSON array wrapped in <sessions> tags exactly like this:

<sessions>
[
  {
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "dayMinutes": 90,
    "nightMinutes": 30,
    "supervisorLicense": "TX12345678",
    "confidence": "high",
    "issues": ""
  }
]
</sessions>

Rules:
- Skip blank or unused rows
- Normalize dates to YYYY-MM-DD ("24" → "2024")
- Normalize times to HH:MM 24-hour
- Convert hour values to integer minutes: "1.5" → 90, "1:30" → 90, "0:45" → 45, "2" → 120
- dayMinutes and nightMinutes should sum to the total drive time implied by startTime→endTime. If they differ by more than 5 minutes, note the discrepancy in issues but still include the row
- supervisorLicense: extract only the DL number (strip initials, spaces, slashes)
- confidence: "low" for illegible entries, missing start/end times, or implausible hour values
- issues: describe any problem or empty string if none
- Return [] if nothing found`

function parseSessionsFromResponse(text) {
  const match = text.match(/<sessions>([\s\S]*?)<\/sessions>/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[1].trim())
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

export const parseLogImage = onCall(
  {
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request) => {
    // onCall verifies the Firebase Auth token automatically
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { imageBase64, formType, mediaType } = request.data

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 is required')
    }
    if (formType !== 'dl91b' && formType !== 'practice-30hr') {
      throw new HttpsError('invalid-argument', 'formType must be "dl91b" or "practice-30hr"')
    }

    const isPdf = mediaType === 'application/pdf'

    // Build the file content block — PDFs use type "document", images use type "image".
    // iOS Safari converts HEIC → JPEG before FileReader sees it, so unknown image
    // types fall back to jpeg.
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: ALLOWED_IMAGE_TYPES.has(mediaType) ? mediaType : 'image/jpeg', data: imageBase64 } }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: formType === 'dl91b' ? DL91B_PROMPT : PRACTICE_30HR_PROMPT,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0]?.text ?? ''
    const sessions = parseSessionsFromResponse(responseText)

    return { sessions }
  }
)
