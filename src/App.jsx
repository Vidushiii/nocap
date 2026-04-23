import { useState, useRef } from 'react'
import './index.css'
import { extractTextFromPDF } from './lib/pdfExtract'
import { chunkText } from './lib/chunker'
import { loadEmbedder, embedText, embedChunks } from './lib/embeddings'
import { findTopChunks } from './lib/retrieval'
import { generateAnswer } from './lib/generate'
import Mode2 from './Mode2'

// ─── Shared styles ────────────────────────────────────────────
const S = {
  orb1: { position:'fixed', width:600, height:600, background:'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)', borderRadius:'50%', top:-200, left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 },
  orb2: { position:'fixed', width:300, height:300, background:'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)', borderRadius:'50%', bottom:100, right:-50, pointerEvents:'none', zIndex:0 },
}

// ─── Landing Page ─────────────────────────────────────────────
function Landing({ onStart }) {
  return (
    <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'3rem 1.5rem', textAlign:'center' }}>

      {/* Eyebrow */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:20, padding:'5px 14px', fontSize:12, color:'#a78bfa', fontWeight:500, letterSpacing:'0.04em', marginBottom:'1.5rem' }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', animation:'pulse 2s ease-in-out infinite' }} />
        For students and teachers. Powered by AI.
      </div>

      {/* Logo */}
      <div style={{ fontFamily:'Syne, sans-serif', fontSize:'clamp(64px,12vw,96px)', fontWeight:800, letterSpacing:-5, lineHeight:0.95, marginBottom:'1.25rem' }}>
        <span style={{ color:'#f0f0f8' }}>No</span>
        <span style={{ background:'linear-gradient(135deg,#a78bfa 0%,#7c3aed 50%,#4f46e5 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Cap</span>
      </div>

      {/* Subtitle */}
      <p style={{ fontSize:'clamp(16px,3vw,20px)', color:'#6060a0', maxWidth:520, lineHeight:1.6, marginBottom:'3rem', fontWeight:400 }}>
        AI writes it. <span style={{ color:'#a0a0d0', fontWeight:500 }}>NoCap checks it.</span><br />
        Students: verify your research before you submit. Teachers: verify what was submitted.
      </p>

      {/* Feature cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, width:'100%', maxWidth:620, marginBottom:'2.5rem' }}>
        <FeatureCard
          icon="📄"
          iconBg="rgba(139,92,246,0.15)"
          title="Ask My Doc"
          desc="Upload any document and ask questions in plain language. Every answer traced back to the exact source — no hallucinations."
          tag="MODE 1"
          tagColor="#a78bfa"
          tagBg="rgba(139,92,246,0.15)"
          hoverBorder="rgba(139,92,246,0.3)"
          onClick={() => onStart('ask')}
        />
        <FeatureCard
          icon="🔍"
          iconBg="rgba(16,185,129,0.15)"
          title="Check Citations"
          desc="Paste citations or upload a document. We verify every reference against 200M+ real papers and flag the fake ones instantly."
          tag="MODE 2"
          tagColor="#10b981"
          tagBg="rgba(16,185,129,0.12)"
          hoverBorder="rgba(16,185,129,0.3)"
          onClick={() => onStart('cite')}
        />
      </div>

      {/* CTA */}
      <div style={{ display:'flex', gap:10, marginBottom:'2.5rem', flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={() => onStart('ask')} style={{ padding:'14px 28px', background:'linear-gradient(135deg,#7c3aed,#8b5cf6)', color:'#fff', border:'none', borderRadius:12, fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, cursor:'pointer', boxShadow:'0 4px 24px rgba(124,58,237,0.35)', letterSpacing:'0.02em' }}>
          Get Started — It's Free
        </button>
        <button onClick={() => onStart('cite')} style={{ padding:'14px 24px', background:'#0f0f1a', color:'#6060a0', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, fontFamily:'DM Sans,sans-serif', fontWeight:500, fontSize:14, cursor:'pointer' }}>
          Check My Citations →
        </button>
      </div>

      {/* Trust strip */}
      <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:12, color:'#6060a0', flexWrap:'wrap', justifyContent:'center' }}>
        {['✓ 100% free', '✓ No account needed', '✓ Your PDF never leaves your browser', '✓ Works for students and teachers'].map((t, i) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            {i > 0 && <span style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'inline-block' }} />}
            {t}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

function FeatureCard({ icon, iconBg, title, desc, tag, tagColor, tagBg, hoverBorder, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background:'#0f0f1a', border:`1px solid ${hovered ? hoverBorder : 'rgba(255,255,255,0.07)'}`, borderRadius:16, padding:'1.25rem', textAlign:'left', cursor:'pointer', transform:hovered ? 'translateY(-2px)' : 'none', transition:'all 0.25s' }}
    >
      <div style={{ width:36, height:36, borderRadius:10, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, marginBottom:5, color:'#f0f0f8' }}>{title}</div>
      <div style={{ fontSize:12, color:'#6060a0', lineHeight:1.6 }}>{desc}</div>
      <div style={{ display:'inline-block', marginTop:10, fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6, background:tagBg, color:tagColor, letterSpacing:'0.05em' }}>{tag}</div>
    </div>
  )
}

// ─── App (both modes) ─────────────────────────────────────────
function AppScreen({ initialMode, onBack }) {
  const [mode, setMode] = useState(initialMode)

  // Mode 1 state
  const [status, setStatus]   = useState('')
  const [docReady, setDocReady] = useState(false)
  const [docName, setDocName]  = useState('')
  const [docMeta, setDocMeta]  = useState(null)
  const docMetaRef = useRef(null)
  const [chunks, setChunks]   = useState([])
  const chunksRef = useRef([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading]  = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [openClaim, setOpenClaim] = useState(null)
  const fileRef = useRef()

  function updateChunks(newChunks) {
    chunksRef.current = newChunks
    setChunks(newChunks)
  }

  function updateDocMeta(meta) {
    docMetaRef.current = meta
    setDocMeta(meta)
  }

  function clearDoc() {
    updateChunks([])
    updateDocMeta(null)
    setChatHistory([])
    setDocReady(false)
    setDocName('')
    setStatus('')
    setOpenClaim(null)
  }

  const claimStyle = {
    FOUND:     { bg:'rgba(16,185,129,0.12)',  border:'#10b981', badge:'#10b981', badgeBg:'rgba(16,185,129,0.15)',  label:'✅ Found' },
    INFERRED:  { bg:'rgba(245,158,11,0.1)',   border:'#f59e0b', badge:'#f59e0b', badgeBg:'rgba(245,158,11,0.12)',  label:'⚠️ Inferred' },
    NOT_FOUND: { bg:'rgba(239,68,68,0.1)',    border:'#ef4444', badge:'#ef4444', badgeBg:'rgba(239,68,68,0.12)',   label:'❌ Not in doc' }
  }

  // ── Mode 1 handlers ──
  async function handleDocUpload(file) {
    if (!file) return
    try {
      setStatus('Reading document...')
      setDocReady(false)
      updateChunks([])
      setDocMeta(null)
      setChatHistory([])
      setOpenClaim(null)
      const { pages, fullText } = await extractTextFromPDF(file)
      const rawChunks = chunkText(pages)
      await loadEmbedder(setStatus)
      const embedded = await embedChunks(rawChunks, setStatus)
      const meta = {
        filename: file.name,
        pages: pages.length,
        wordCount: fullText.split(/\s+/).filter(w => w).length,
        charCount: fullText.length,
        chunkCount: embedded.length,
      }
      updateChunks(embedded)
      updateDocMeta(meta)
      setDocName(file.name)
      setDocReady(true)
      const pageCount = new Set(embedded.map(c => c.page)).size
      setStatus(`✓ Ready — ${embedded.length} chunks from ${pageCount} pages`)
      setTimeout(() => setStatus(''), 2500)
    } catch (e) {
      console.error(e)
      setStatus('Error: ' + (e.message ?? 'Something went wrong. Refresh and try again.'))
    }
  }

  const handleAsk = async () => {
    const q = question.trim()
    if (!q || !docReady || loading) return
    setQuestion('')
    setLoading(true)
    setOpenClaim(null)
    const activeChunks = chunksRef.current
    const activeMeta   = docMetaRef.current
    try {
      setStatus('Finding relevant sections...')
      const isSummaryRequest = /summar|overview|about|what is this|what does this|tldr|tell me about this doc/i.test(q)
      let top
      if (isSummaryRequest) {
        top = activeChunks
      } else {
        const qVec = await embedText(q)
        top = findTopChunks(qVec, activeChunks, 5, q)
      }
      setStatus('Generating answer...')
      const answer = await generateAnswer(q, top, activeMeta)
      // BUG 4: append to history instead of replacing
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        question: q,
        result: { ...answer, sourceChunks: top },
        timestamp: new Date(),
      }])
    } catch (e) {
      setStatus('Something went wrong. Try again.')
      console.error(e)
    }
    // BUG 3: always reset loading so Ask button re-enables
    setLoading(false)
    setStatus('')
  }

  // BUG 5: download chat as .txt
  function downloadChat() {
    const sep = '─────────────────────'
    const lines = [
      sep,
      'NoCap Chat Export',
      `Document: ${docName}`,
      `Date: ${new Date().toLocaleString()}`,
      sep,
    ]
    chatHistory.forEach(entry => {
      lines.push(`Q: ${entry.question}`)
      if (!entry.result.found) {
        lines.push('A: Not in your doc. NoCap.')
      } else {
        const fullText = entry.result.claims?.map(c => c.text).join(' ') ?? ''
        lines.push(`A: ${fullText}`)
        lines.push('Claims:')
        entry.result.claims?.forEach(c => lines.push(`  [${c.type}] ${c.text}`))
      }
      lines.push(sep)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `nocap-chat-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ position:'relative', zIndex:1, maxWidth:780, margin:'0 auto', padding:'2rem 1.5rem 4rem' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, letterSpacing:-1.5 }}>
          No<span style={{ background:'linear-gradient(135deg,#a78bfa,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Cap</span>
        </div>
        <button onClick={onBack} style={{ fontSize:13, color:'#6060a0', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>← Back</button>
      </div>

      {/* Mode switcher */}
      <div style={{ display:'flex', gap:4, background:'#0f0f1a', padding:5, borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', marginBottom:'1.5rem' }}>
        {[['ask','📄 Ask My Doc'],['cite','🔍 Check Citations']].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{
            flex:1, padding:'11px 0', borderRadius:10,
            fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600,
            background: mode===id ? 'linear-gradient(135deg,#7c3aed,#8b5cf6)' : 'transparent',
            color: mode===id ? '#fff' : '#6060a0',
            boxShadow: mode===id ? '0 4px 16px rgba(124,58,237,0.3)' : 'none',
            transition:'all 0.2s'
          }}>{label}</button>
        ))}
      </div>

      {/* ── MODE 1 ── */}
      {mode === 'ask' && (
        <div>
          <div style={{ background:'#0f0f1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'1.5rem', marginBottom:'1rem' }}>

            {/* Upload zone */}
            <div style={{ position:'relative', marginBottom:'1.25rem' }}>
              <div
                onClick={docReady ? undefined : () => fileRef.current.click()}
                onDragOver={docReady ? undefined : e => e.preventDefault()}
                onDrop={docReady ? undefined : e => { e.preventDefault(); handleDocUpload(e.dataTransfer.files[0]) }}
                style={{ border:`1.5px dashed ${docReady ? '#10b981' : 'rgba(255,255,255,0.12)'}`, borderRadius:12, padding:'2rem', textAlign:'center', cursor: docReady ? 'default' : 'pointer', background: docReady ? 'rgba(16,185,129,0.07)' : '#16162a', transition:'all 0.2s' }}
              >
                <div style={{ fontSize:32, marginBottom:10 }}>{docReady ? '✅' : '📄'}</div>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:15, marginBottom:4 }}>
                  {docReady ? 'Doc indexed — drop another to replace' : 'Drop your PDF or DOCX here'}
                </div>
                <div style={{ fontSize:12, color:'#6060a0' }}>
                  {docReady ? `${chunks.length} chunks ready · ${docName}` : 'Textbook, notes, research paper — .pdf or .docx'}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" disabled={docReady} style={{ display:'none' }}
                  onChange={e => { handleDocUpload(e.target.files[0]); e.target.value = '' }} />
              </div>
              {docReady && (
                <button
                  onClick={e => { e.stopPropagation(); clearDoc() }}
                  title="Remove document"
                  style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#6060a0', fontSize:14, lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.color='#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#6060a0' }}
                >×</button>
              )}
            </div>

            {status && (
              <div style={{ textAlign:'center', color:'#a78bfa', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:'1rem' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', animation:'pulse 1.2s ease-in-out infinite' }} />
                {status}
              </div>
            )}

            {/* Question input */}
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAsk() } }}
                placeholder={docReady ? 'Ask anything about your doc...' : 'Upload a doc first'}
                disabled={!docReady || loading}
                style={{ flex:1, padding:'13px 16px', background:'#16162a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, fontSize:14, color:'#f0f0f8', outline:'none' }}
              />
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); handleAsk() }}
                disabled={!docReady || loading || !question.trim()}
                style={{ padding:'13px 22px', borderRadius:12, fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, background: docReady && question.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#8b5cf6)' : '#16162a', color: docReady && question.trim() && !loading ? '#fff' : '#6060a0', boxShadow: docReady && question.trim() ? '0 4px 16px rgba(124,58,237,0.3)' : 'none', transition:'all 0.2s' }}
              >{loading ? 'Thinking...' : 'Ask'}</button>
            </div>
          </div>

          {/* BUG 4+5: Chat history */}
          {chatHistory.length > 0 && (
            <div>
              {/* BUG 5: Download button */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'#6060a0', textTransform:'uppercase' }}>
                  Chat — {chatHistory.length} {chatHistory.length === 1 ? 'question' : 'questions'}
                </div>
                <button
                  onClick={downloadChat}
                  style={{ fontSize:12, color:'#a78bfa', background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontWeight:500 }}
                >
                  ↓ Download Chat
                </button>
              </div>

              {[...chatHistory].reverse().map((entry, renderIdx, arr) => {
                const entryIdx = chatHistory.indexOf(entry)
                const isLast = renderIdx === arr.length - 1
                return (
                  <div key={entry.id} style={{ marginBottom: isLast ? '0.5rem' : '1.25rem' }}>

                    {/* User bubble — right */}
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
                      <div style={{ maxWidth:'75%' }}>
                        <div style={{ background:'linear-gradient(135deg,#7c3aed,#8b5cf6)', borderRadius:'14px 14px 4px 14px', padding:'10px 14px', fontSize:14, color:'#fff', lineHeight:1.5 }}>
                          {entry.question}
                        </div>
                        <div style={{ fontSize:10, color:'#555580', textAlign:'right', marginTop:4 }}>
                          {entry.timestamp.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* NoCap answer bubble — left */}
                    <div style={{ display:'flex', justifyContent:'flex-start' }}>
                      <div style={{ maxWidth:'90%', width:'100%' }}>
                        <div style={{ background:'#0f0f1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'4px 14px 14px 14px', padding:'1rem 1.25rem' }}>
                          {!entry.result.found ? (
                            <div style={{ color:'#ef4444', fontWeight:700, fontSize:16, fontFamily:'Syne,sans-serif' }}>Not in your doc. NoCap.</div>
                          ) : (
                            <>
                              <div style={{ lineHeight:2.2 }}>
                                {(() => {
                                  // Normalise claims — short/bare values get wrapped in a sentence
                                  const rawClaims = entry.result.claims ?? []
                                  const answerFallback = entry.result.answer ?? ''

                                  // If claims are empty or all claim texts are blank, use result.answer as one FOUND span
                                  const visibleClaims = rawClaims.length === 0
                                    ? (answerFallback ? [{ text: answerFallback, type: 'FOUND', chunkId: null }] : [])
                                    : rawClaims.map(claim => {
                                        const words = (claim.text ?? '').trim().split(/\s+/).filter(Boolean)
                                        // Bare number or fewer than 5 words — wrap it
                                        const needsWrap = words.length < 5
                                        const displayText = needsWrap && answerFallback
                                          ? answerFallback
                                          : (claim.text ?? '').trim() || answerFallback
                                        return { ...claim, text: displayText }
                                      }).filter(claim => claim.text)

                                  // If after normalisation still nothing, render answer directly
                                  if (visibleClaims.length === 0 && answerFallback) {
                                    return <span style={{ fontSize:14, color:'#d0d0e8', lineHeight:1.8 }}>{answerFallback}</span>
                                  }

                                  return visibleClaims.map((claim, ci) => {
                                    const c = claimStyle[claim.type] || claimStyle.FOUND
                                    const isSelected = openClaim?.entryIdx === entryIdx && openClaim?.claim?.text === claim.text
                                    return (
                                      <span key={ci}
                                        onClick={() => setOpenClaim(isSelected ? null : { entryIdx, claim })}
                                        style={{ display:'inline', background:c.bg, border:`1px solid ${isSelected ? c.border : 'transparent'}`, borderRadius:5, padding:'2px 5px', marginRight:4, cursor:'pointer', fontSize:14, lineHeight:2.2, transition:'all 0.15s' }}>
                                        {claim.text}
                                      </span>
                                    )
                                  })
                                })()}
                              </div>

                              {/* Source drawer for this entry */}
                              {openClaim?.entryIdx === entryIdx && (() => {
                                const c = claimStyle[openClaim.claim.type] || claimStyle.FOUND
                                const sourceChunk = entry.result.sourceChunks?.find(ch => ch.id === openClaim.claim.chunkId)
                                return (
                                  <div style={{ marginTop:'0.75rem', background:'#16162a', borderRadius:10, padding:'0.85rem 1rem', borderLeft:`3px solid ${c.border}` }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                      <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:c.badgeBg, color:c.badge }}>{c.label}</span>
                                      <button onClick={() => setOpenClaim(null)} style={{ background:'none', color:'#555', fontSize:18, border:'none', cursor:'pointer' }}>×</button>
                                    </div>
                                    {sourceChunk ? (
                                      <>
                                        <div style={{ fontSize:11, color:'#6060a0', marginBottom:6 }}>📍 Page {sourceChunk.page}</div>
                                        <div style={{ fontSize:12, color:'#b0b0c8', lineHeight:1.7, fontStyle:'italic', borderLeft:'2px solid rgba(255,255,255,0.07)', paddingLeft:10 }}>
                                          "{sourceChunk.text.slice(0, 300)}..."
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ fontSize:13, color:'#ef4444' }}>No source found in your document for this claim.</div>
                                    )}
                                  </div>
                                )
                              })()}

                              {/* Legend */}
                              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:'0.75rem', paddingTop:'0.75rem', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                                {Object.entries(claimStyle).map(([k, v]) => (
                                  <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6060a0' }}>
                                    <div style={{ width:8, height:8, borderRadius:2, background:v.badgeBg, border:`1px solid ${v.badge}` }} />
                                    {v.label}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize:10, color:'#555580', marginTop:4 }}>
                          {entry.timestamp.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                    </div>

                  </div>
                )
              })}

            </div>
          )}

          {/* Typing indicator — shows on every question including first */}
          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:'1rem' }}>
              <div style={{ background:'#0f0f1a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'4px 14px 14px 14px', padding:'12px 18px', display:'flex', gap:6, alignItems:'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', animation:`pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
                <span style={{ fontSize:13, color:'#a78bfa', marginLeft:4 }}>NoCap is thinking...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODE 2 ── */}
      {mode === 'cite' && <Mode2 />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('landing')
  const [startMode, setStartMode] = useState('ask')

  function handleStart(mode) {
    setStartMode(mode)
    setScreen('app')
  }

  return (
    <>
      <div style={S.orb1} />
      <div style={S.orb2} />
      {screen === 'landing'
        ? <Landing onStart={handleStart} />
        : <AppScreen initialMode={startMode} onBack={() => setScreen('landing')} />
      }
    </>
  )
}