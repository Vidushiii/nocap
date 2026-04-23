export function chunkText(pages, chunkSize = 400, overlap = 60) {
  const chunks = []
  for (const { pageNum, text } of pages) {
    const words = text.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const slice = words.slice(i, i + chunkSize)
      if (slice.length < 15) continue
      chunks.push({ id: chunks.length, page: pageNum, text: slice.join(' ') })
    }
  }
  return chunks
}
