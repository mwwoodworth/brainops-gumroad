export interface BidEmailPayload {
  subject: string
  fromEmail: string
  fromName?: string
  bodyText?: string
  bodyHtml?: string
  attachments?: Array<{
    filename: string
    contentType?: string
    size?: number
    url?: string
  }>
  receivedAt?: string
  raw?: unknown
}

export interface ParsedBidDetails {
  customerName?: string
  projectName?: string
  projectAddress?: string
  dueDate?: string
  bidAmount?: number
  scopeKeywords: string[]
  summary: string
  notes: string[]
  winProbability: number
  priorityScore: number
  confidence: number
}

const KEYWORD_DICTIONARY = [
  'roof',
  're-roof',
  'service',
  'maintenance',
  'metal',
  'coating',
  'retrofit',
  'commercial',
  'industrial',
  'school',
  'hospital',
  'government',
  'emergency',
  'bid',
  'proposal',
  'invitation',
  'rfi',
  'addendum',
]

const HIGH_VALUE_KEYWORDS = ['emergency', 'rapid response', 'bonded', 'federal', 'state', 'county']

const DATE_REGEX =
  /\b(?:due|deadline|bid date|bids? (?:due|close)|closing)\s*(?:on|by|:)?\s*(\w{3,9}\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i

const AMOUNT_REGEX =
  /\b(?:budget|estimate|value|amount|project value|construction cost)\s*(?:is|:)?\s*\$?([\d,.]+)(?:\s*(million|thousand|k|m))?/i

function parseAmount(text: string | undefined): number | undefined {
  if (!text) return undefined
  const match = text.match(AMOUNT_REGEX)
  if (!match) return undefined

  const raw = match[1].replace(/,/g, '')
  const base = parseFloat(raw)
  if (isNaN(base)) return undefined

  const magnitude = match[2]?.toLowerCase()
  if (!magnitude) return base
  if (['million', 'm'].includes(magnitude)) return base * 1_000_000
  if (['thousand', 'k'].includes(magnitude)) return base * 1_000
  return base
}

function parseDueDate(text: string | undefined): string | undefined {
  if (!text) return undefined
  const match = text.match(DATE_REGEX)
  if (!match) return undefined

  const value = match[1]
  const candidate = new Date(value)
  if (!isNaN(candidate.getTime())) {
    return candidate.toISOString()
  }

  const parts = value.split('/')
  if (parts.length >= 2) {
    const [month, day, year] = parts
    const fullYear = year
      ? year.length === 2
        ? `20${year}`
        : year
      : `${new Date().getFullYear()}`
    const isoCandidate = new Date(`${fullYear}-${month}-${day}`)
    if (!isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString()
    }
  }
  return undefined

}

function extractScopeKeywords(source: string | undefined): string[] {
  if (!source) return []
  const lower = source.toLowerCase()
  const matches = new Set<string>()
  KEYWORD_DICTIONARY.forEach(keyword => {
    if (lower.includes(keyword)) matches.add(keyword)
  })
  return Array.from(matches).sort()
}

function buildSummary(subject: string, body: string | undefined): string {
  if (body) {
    const lines = body
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
    const firstLine = lines.slice(0, 2).join(' ')
    if (firstLine) {
      return `${subject.trim()} — ${firstLine}`.slice(0, 320)
    }
  }
  return subject.slice(0, 280)
}

function scoreOpportunity(details: {
  dueDate?: string
  amount?: number
  keywords: string[]
  body?: string
}): { priorityScore: number; winProbability: number; confidence: number; notes: string[] } {
  const notes: string[] = []
  let score = 0
  let winProbability = 55
  let confidence = 0.45

  if (details.amount) {
    const magnitudeScore = Math.min(details.amount / 250_000, 2.5)
    score += magnitudeScore * 12
    notes.push(`Budget signal: ~$${Math.round(details.amount).toLocaleString()}`)
    if (details.amount > 1_000_000) {
      winProbability += 5
      confidence += 0.05
    }
  } else {
    notes.push('No explicit budget detected')
  }

  if (details.dueDate) {
    const due = new Date(details.dueDate)
    const now = new Date()
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (!isNaN(diffDays)) {
      if (diffDays <= 3) {
        score += 25
        winProbability += 6
        notes.push('Bid due inside 3 days')
      } else if (diffDays <= 7) {
        score += 18
        notes.push('Bid due inside 1 week')
      } else if (diffDays <= 14) {
        score += 12
      } else {
        score += 6
        notes.push('Longer runway on due date')
      }
      confidence += 0.1
    }
  } else {
    notes.push('Due date not detected')
  }

  if (details.keywords.length) {
    const multiplier = details.keywords.includes('emergency') ? 1.25 : 1
    score += Math.min(details.keywords.length * 4 * multiplier, 20)
    notes.push(`Scope indicators: ${details.keywords.join(', ')}`)

    if (details.keywords.some(keyword => HIGH_VALUE_KEYWORDS.includes(keyword))) {
      winProbability += 5
      confidence += 0.05
    }
  }

  if (details.body) {
    const text = details.body.toLowerCase()
    if (text.includes('preferred') || text.includes('repeat client')) {
      winProbability += 8
      notes.push('Language hints at incumbent relationship')
    }
    if (text.includes('pre-bid') || text.includes('mandatory site visit')) {
      score += 6
      notes.push('Pre-bid meeting referenced')
    }
  }

  return {
    priorityScore: Math.round(Math.min(score, 100)),
    winProbability: Math.round(Math.max(Math.min(winProbability, 95), 10)),
    confidence: Math.max(Math.min(confidence, 0.95), 0.25),
    notes,
  }
}

export function parseBidEmail(payload: BidEmailPayload): ParsedBidDetails {
  const bodyText = payload.bodyText ?? ''
  const consolidatedBody = bodyText || payload.bodyHtml?.replace(/<[^>]+>/g, ' ') || ''
  const scopeKeywords = extractScopeKeywords(`${payload.subject} ${consolidatedBody}`)
  const bidAmount = parseAmount(consolidatedBody)
  const dueDate = parseDueDate(consolidatedBody)

  const scoring = scoreOpportunity({
    dueDate,
    amount: bidAmount,
    keywords: scopeKeywords,
    body: consolidatedBody,
  })

  const notes = [...scoring.notes]
  if (payload.attachments?.length) {
    notes.push(`${payload.attachments.length} attachment${payload.attachments.length > 1 ? 's' : ''} detected`)
  }

  return {
    customerName: extractName(payload.subject) ?? payload.fromName,
    projectName: extractProjectName(payload.subject) ?? scopeKeywords[0],
    projectAddress: extractAddress(consolidatedBody),
    dueDate,
    bidAmount,
    scopeKeywords,
    summary: buildSummary(payload.subject, bodyText),
    notes,
    winProbability: scoring.winProbability,
    priorityScore: scoring.priorityScore,
    confidence: scoring.confidence,
  }
}

function extractName(subject: string): string | undefined {
  const match = subject.match(/for\s+([A-Za-z0-9&\s]+)\s+(?:project|facility|bid)/i)
  if (match) return match[1].trim()
  return undefined
}

function extractProjectName(subject: string): string | undefined {
  const match = subject.match(/project[:\s]+(.+?)(?:$| - | bid)/i)
  if (match) return match[1].trim()
  return undefined
}

function extractAddress(body: string): string | undefined {
  const match = body.match(/\b\d{2,5}\s+[A-Za-z0-9\s.]+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Drive|Dr\.|Boulevard|Blvd\.|Highway|Hwy)\b/i)
  if (match) return match[0]
  return undefined
}
