import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false

let embedder = null

self.onmessage = async ({ data }) => {
  const { type, id, text } = data
  try {
    if (type === 'load') {
      if (!embedder) {
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          revision: 'main',
          progress_callback: (x) => {
            if (x.status === 'progress') {
              self.postMessage({
                type: 'progress',
                text: `Downloading model... ${Math.round(x.progress ?? 0)}%`,
              })
            }
          },
        })
      }
      self.postMessage({ type: 'done', id, result: null })

    } else if (type === 'embed') {
      const out = await embedder(text, { pooling: 'mean', normalize: true })
      self.postMessage({ type: 'done', id, result: Array.from(out.data) })
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err.message })
  }
}
