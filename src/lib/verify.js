// ─── Word overlap scoring — format agnostic ───────────────────────────────

function overlapScore(citation, returnedTitle) {
  if (!returnedTitle) return 0

  const stopwords = new Set([
    'a','an','the','in','on','at','to','of','and','or','for','with','by',
    'from','is','are','was','were','its','this','that','be','as','it',
    'into','via','using','based','new','large','deep',
  ])

  const tokenize = str => str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))

  const citWords  = tokenize(citation)
  const titleSet  = new Set(tokenize(returnedTitle))

  if (!citWords.length || !titleSet.size) return 0

  const matches = citWords.filter(w => titleSet.has(w))
  return matches.length / Math.min(citWords.length, titleSet.size)
}

// ─── API helpers ──────────────────────────────────────────────────────────

async function searchSemanticScholar(query) {
  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search` +
    `?query=${encodeURIComponent(query)}&limit=3&fields=title,authors,year`,
    { signal: AbortSignal.timeout(8000) }
  )
  const data = await res.json()
  if (!data.data?.length) return null
  const p = data.data[0]
  return {
    title:   p.title   || '',
    authors: p.authors?.map(a => a.name).join(', ') || '',
    year:    p.year,
  }
}

async function searchCrossRef(query) {
  const res = await fetch(
    `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=1`,
    { signal: AbortSignal.timeout(8000) }
  )
  const data = await res.json()
  const item = data.message?.items?.[0]
  if (!item?.title?.[0]) return null
  return {
    title:   item.title[0],
    authors: item.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()).join(', ') || '',
    year:    item.published?.['date-parts']?.[0]?.[0],
  }
}

// ─── URL verification ─────────────────────────────────────────────────────

function isURL(text) {
  return /^https?:\/\//i.test(text.trim())
}

async function checkDNS(url) {
  try {
    const domain = new URL(url).hostname
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`)
    if (!res.ok) return false
    const data = await res.json()
    return data.Status === 0 && (data.Answer?.length > 0 || data.Authority?.length > 0)
  } catch {
    return false
  }
}

async function askGroqAboutURL(url, docChunks) {
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

  const hasDoc = docChunks && docChunks.length > 0
  const docSection = hasDoc
    ? `Their document contains these key claims:\n${docChunks.map((c, i) => `[${i + 1}] ${c.text.slice(0, 200)}`).join('\n')}`
    : 'No document context provided — evaluate the URL on its own merit as a citable source.'

  const prompt = `You are NoCap — a citation verification assistant.

A student submitted this URL as a reference in their document:
URL: ${url}

${docSection}

Based on your knowledge of this URL/domain:
1. Does this URL/website exist and is it accessible?
2. Does the content of this URL plausibly support any of the claims in the document above?
3. Is this a credible source for the type of content in this document?

Return JSON only:
{
  "urlExists": true,
  "supportsDocument": true,
  "relevanceScore": 0,
  "sourceType": "academic|educational|news|official|blog|forum|unknown",
  "whatThisSourceIs": "one sentence describing the URL/site",
  "doesItMatchClaims": "one sentence — does this source support the document?",
  "verdict": "strong_match|partial_match|weak_match|no_match|url_invalid",
  "recommendation": "one sentence advice for the student"
}`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? ''
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse Groq response')
  }
}

async function verifyURL(url, docChunks) {
  const domainExists = await checkDNS(url)
  if (!domainExists) {
    return { status: 'cap', url, recommendation: 'This URL does not appear to exist. Check the address and try again.' }
  }

  let analysis = null
  try { analysis = await askGroqAboutURL(url, docChunks) } catch {}

  if (!analysis) {
    return { status: 'sketchy', url, whatThisSourceIs: 'Domain exists', recommendation: 'Content analysis unavailable — verify this source manually.' }
  }

  if (!analysis.urlExists || analysis.verdict === 'url_invalid') {
    return { status: 'cap', url, recommendation: 'This URL does not appear to exist.' }
  }

  const status = analysis.verdict === 'strong_match'
    ? 'real'
    : ['partial_match', 'weak_match', 'no_match'].includes(analysis.verdict)
      ? 'sketchy'
      : 'cap'

  return {
    status,
    url,
    sourceType:        analysis.sourceType,
    whatThisSourceIs:  analysis.whatThisSourceIs,
    doesItMatchClaims: analysis.doesItMatchClaims,
    verdict:           analysis.verdict,
    recommendation:    analysis.recommendation,
    relevanceScore:    analysis.relevanceScore,
  }
}

// ─── Academic citation verification ───────────────────────────────────────

export async function verifyCitation(rawLine, docChunks = []) {
  const line = rawLine.trim()
  if (!line || line.length < 10) return { status: 'cap', reason: 'Too short' }

  // Detect URL anywhere in the line
  const urlMatch = line.match(/https?:\/\/[^\s,;)]+/)
  if (urlMatch) return verifyURL(urlMatch[0], docChunks)

  // Clean the line — remove citation noise, keep meaningful words
  const cleaned = line
    .replace(/^\[\d+\]\s*/, '')                      // [1]
    .replace(/^\d+\.\s*/, '')                         // 1.
    .replace(/\b(vol|pp|no|ed|doi|isbn)\b.*/i, '')   // metadata tail
    .replace(/\(\d{4}[a-z]?\)/g, '')                 // (2017) / (2017a)
    .replace(/\d{4}[a-z]?\./g, '')                   // 2017.
    .replace(/[,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  // Search both APIs in parallel
  const [s2Result, crResult] = await Promise.allSettled([
    searchSemanticScholar(cleaned),
    searchCrossRef(cleaned),
  ])

  const s2 = s2Result.status === 'fulfilled' ? s2Result.value : null
  const cr = crResult.status === 'fulfilled' ? crResult.value : null

  const s2Score  = s2 ? overlapScore(line, s2.title) : 0
  const crScore  = cr ? overlapScore(line, cr.title) : 0
  const bestScore = Math.max(s2Score, crScore)
  const best      = s2Score >= crScore ? s2 : cr

  if (bestScore >= 0.3) {
    return {
      status:  'real',
      title:   best.title,
      authors: best.authors,
      year:    best.year,
      score:   bestScore,
    }
  }

  if (bestScore >= 0.12) {
    return {
      status:  'sketchy',
      title:   best?.title,
      authors: best?.authors,
      year:    best?.year,
      reason:  'Found similar paper but details do not fully match',
    }
  }

  return { status: 'cap', reason: 'No matching paper found in any academic database' }
}

// ─── Citation extraction from document text ───────────────────────────────

function splitIntoCitations(refSectionText) {
  // STEP 1 — Numbered markers: [1] ... [2] ... or 1. ... 2. ...
  const numberedSplit = refSectionText
    .split(/(?=\[\d+\]|\n\d+\.\s)/)
    .map(s => s.replace(/^\[\d+\]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(s => s.length > 20)
  if (numberedSplit.length > 2) return numberedSplit

  // STEP 2 — Author patterns: new citation after period when next token is Lastname, F. or LASTNAME, F.
  const authorSplit = refSectionText
    .split(/(?<=\.)\s+(?=[A-Z][a-z]+,\s[A-Z]|[A-Z]{2,},\s)/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
  if (authorSplit.length > 2) return authorSplit

  // STEP 3 — Year boundary: new citation starts after "...2017. " or "...2017). "
  const yearSplit = refSectionText
    .split(/(?<=\d{4}[a-z]?[.)]\s{1,3})(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
  if (yearSplit.length > 2) return yearSplit

  // STEP 4 — Fallback: newlines
  return refSectionText
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 20)
}

function extractURLsFromLine(line) {
  const urlRegex = /https?:\/\/[^\s,;)]+/gi
  const urls = line.match(urlRegex) ?? []
  const textOnly = line.replace(urlRegex, '').trim()
  const results = []
  if (textOnly.length > 15) results.push(textOnly)
  urls.forEach(url => results.push(url))
  return results
}

// Returns parsed citation strings, or null if no references section found.
// Never returns full document text — caller must treat null as "not found".
export function extractCitations(text) {
  const lower = text.toLowerCase()

  const refMarkers = [
    'references', 'bibliography', 'works cited',
    'citations', 'reference list', 'sources',
    'literature cited', 'further reading',
    '[1]', '[2]', '[3]',
  ]
  const lastIndex = Math.max(...refMarkers.map(m => lower.lastIndexOf(m)))

  console.log('[NoCap] Reference section found at index:', lastIndex)

  if (lastIndex < 0) return null

  const section = text.slice(lastIndex)

  // Split into individual citations using the smart splitter
  const raw = splitIntoCitations(section)

  // Expand any line that contains an embedded URL into separate items
  const citations = raw.flatMap(line => extractURLsFromLine(line))

  console.log('[NoCap] Citations extracted:', citations.length, citations)

  return citations.length > 0 ? citations : null
}
