// Pure JS TF-IDF embeddings — no model, no WASM, no workers, no loading step

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','up','about','into','through','during','is','are','was',
  'were','be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','that','this',
  'these','those','it','its','i','you','he','she','we','they','what',
  'which','who','whom','there','here','when','where','why','how','all',
  'each','both','few','more','most','other','some','such','no','not',
  'only','own','same','so','than','too','very','just','as','if',
])

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
}

let _vocab = []
let _idf   = {}

function buildVocab(chunks) {
  const docFreq = {}
  const N = chunks.length
  for (const c of chunks) {
    for (const term of new Set(tokenize(c.text))) {
      docFreq[term] = (docFreq[term] || 0) + 1
    }
  }
  _vocab = Object.keys(docFreq)
  for (const term of _vocab) {
    _idf[term] = Math.log((N + 1) / (docFreq[term] + 1)) + 1
  }
}

function toVector(text) {
  const tokens = tokenize(text)
  const tf = {}
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1
  const len = tokens.length || 1
  return _vocab.map(term => ((tf[term] || 0) / len) * (_idf[term] || 0))
}

// Kept for API compatibility — TF-IDF needs no loading
export function loadEmbedder() { return Promise.resolve() }

export function embedText(text) {
  return Promise.resolve(toVector(text))
}

export async function embedChunks(chunks, onProgress) {
  buildVocab(chunks)
  const result = []
  for (let i = 0; i < chunks.length; i++) {
    result.push({ ...chunks[i], embedding: toVector(chunks[i].text) })
    onProgress(`Indexing... ${Math.round(((i + 1) / chunks.length) * 100)}%`)
    // Yield so React can re-render the progress update
    await new Promise(r => setTimeout(r, 0))
  }
  return result
}
