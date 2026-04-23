# NoCap

> No lies. No fake sources. No cap.

**NoCap** is a free browser-based tool that helps students and teachers 
verify AI-generated citations and ask questions about their documents — 
grounded in the actual source, not hallucinated.

## What it does

**Mode 1 — Ask My Doc**
Upload any PDF. Ask questions in plain language. Every answer is traced 
back to the exact page it came from. If it's not in the doc, NoCap says so.

**Mode 2 — Check Citations**
Paste citations or upload an essay. NoCap verifies every reference against 
200M+ real papers via Semantic Scholar and CrossRef. Fake citations are 
flagged as ❌ Cap before you submit.

## Why it exists

40% of AI-generated citations are fabricated. 92% of students now use AI 
for assignments. Students get penalized for academic fraud they didn't 
intend. NoCap catches it first.

## Tech stack

- Vite + React (frontend)
- RAG pipeline — pure JavaScript, zero dependencies (TF-IDF + cosine similarity)
- Groq API — Llama 3 for generation
- Semantic Scholar + CrossRef APIs for citation verification
- pdfjs-dist for PDF extraction
- 100% browser-based — no backend, no server, no data stored

## Run locally

git clone https://github.com/Vidushiii/nocap.git
cd nocap
npm install
echo "VITE_GROQ_API_KEY=your_key_here" > .env.local
npm run dev

## Live

[nocap.vercel.app](https://nocap.vercel.app)

## Built by

Vidushi Tomar — [vidutomar19@gmail.com](mailto:vidutomar19@gmail.com)
