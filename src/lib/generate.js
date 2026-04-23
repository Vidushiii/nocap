const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function buildSystemPrompt(docMeta, chunks) {
  const sectionsText = chunks && chunks.length > 0
    ? chunks.map((c, i) => `[Section ${i + 1}]: ${c.text}`).join('\n\n')
    : '(no content sections provided)'

  return `You are NoCap — an intelligent document assistant.
You have been given a document to analyze.

Document metadata:
- Filename: ${docMeta.filename}
- Pages: ${docMeta.pages}
- Words: ${docMeta.wordCount}
- Characters: ${docMeta.charCount}

Document content (most relevant sections):
${sectionsText}

YOUR JOB:
Answer the user's question using the document above.
Be helpful, clear, and thorough like ChatGPT would be.

RULES:
1. If asked for a summary/overview — summarize the ENTIRE document in 3-5 sentences based on all sections
2. If asked about specific content — find it in the sections and explain it clearly
3. If asked about document properties (pages, words) — answer from the metadata
4. ONLY say content is not in the doc if you genuinely cannot find anything relevant after checking all sections
5. Never say "Not in your doc" for summary requests
6. Never make up information not in the document
7. Be conversational and clear, not robotic

IMPORTANT — for summaries, use ALL provided sections, not just the first one.

Return ONLY raw JSON — no markdown, no backticks:
{
  "found": true,
  "answer": "your full answer here",
  "claims": [
    {
      "text": "one sentence from your answer",
      "type": "FOUND",
      "chunkId": 0
    }
  ]
}

Claim types:
- "FOUND": directly stated in a chunk or metadata
- "INFERRED": logically follows from chunks/metadata but not explicitly stated
- "NOT_FOUND": not supported by chunks or metadata
For metadata-based answers set chunkId to null.
If truly nothing relevant: { "found": false, "answer": "Not in your doc. NoCap.", "claims": [] }`
}

export async function generateAnswer(question, topChunks, docMeta) {
  if (!docMeta) return { found: false, claims: [] }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: buildSystemPrompt(docMeta, topChunks) },
        { role: 'user', content: `Question: ${question}` },
      ],
      temperature: 0.1,
      max_tokens: 1200,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq ${res.status}: ${body}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('Empty response from Groq')

  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse Groq response')
  }
}
