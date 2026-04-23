import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import mammoth from 'mammoth/mammoth.browser.min.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'

async function extractFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    standardFontDataUrl: '/standard_fonts/',
  }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim()
    if (text.length > 0) pages.push({ pageNum: i, text })
  }

  return { fullText: pages.map(p => p.text).join(' '), pages }
}

async function extractFromDOCX(arrayBuffer) {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
  const div = document.createElement('div')
  div.innerHTML = html

  const paragraphs = Array.from(div.querySelectorAll('p, h1, h2, h3, h4, li'))
    .map(el => el.textContent.trim())
    .filter(t => t.length > 0)

  const pages = []
  let buffer = [], wordCount = 0, pageNum = 1
  for (const para of paragraphs) {
    buffer.push(para)
    wordCount += para.split(/\s+/).length
    if (wordCount >= 400) {
      pages.push({ pageNum, text: buffer.join(' ') })
      pageNum++
      buffer = []
      wordCount = 0
    }
  }
  if (buffer.length) pages.push({ pageNum, text: buffer.join(' ') })

  return { fullText: paragraphs.join(' '), pages }
}

export async function extractTextFromPDF(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const arrayBuffer = await file.arrayBuffer()
  if (ext === 'pdf') return extractFromPDF(arrayBuffer)
  if (ext === 'docx' || ext === 'doc') return extractFromDOCX(arrayBuffer)
  throw new Error(`Unsupported format .${ext} — upload a PDF or DOCX`)
}
