function cosine(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1)
}

const MIN_SCORE = 0.05
const KEYWORD_FALLBACK_THRESHOLD = 0.1

function keywordSearch(query, chunks, k = 3) {
  const queryWords = query.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2)

  return chunks
    .map(c => {
      const text = c.text.toLowerCase()
      const matches = queryWords.filter(w => text.includes(w))
      return { ...c, keywordScore: matches.length / queryWords.length }
    })
    .filter(c => c.keywordScore > 0)
    .sort((a, b) => b.keywordScore - a.keywordScore)
    .slice(0, k)
}

export function findTopChunks(queryEmbedding, chunks, k = 5, query = '') {
  const scored = chunks
    .map(c => ({ ...c, score: cosine(queryEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)

  if (scored.length === 0 || scored[0].score < MIN_SCORE) return []

  // If TF-IDF confidence is low, blend in keyword results as fallback
  if (query && scored[0].score < KEYWORD_FALLBACK_THRESHOLD) {
    const kwChunks = keywordSearch(query, chunks, 3)
    const seen = new Set()
    const merged = [...scored, ...kwChunks].filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    return merged.slice(0, 5)
  }

  return scored
}
