import { useRef, useState } from 'react'
import './App.css'

const navigation = ['Dashboard', 'URL Analyzer', 'Message Analyzer', 'QR Analyzer', 'History', 'About']
const qrAcceptTypes = ['image/png', 'image/jpeg', 'image/webp']

function App() {
  const [activeView, setActiveView] = useState('Dashboard')
  const [mode, setMode] = useState('URL')
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrFile, setQrFile] = useState(null)
  const [qrPreview, setQrPreview] = useState('')
  const [qrResult, setQrResult] = useState(null)
  const [qrError, setQrError] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const qrInputRef = useRef(null)

  function selectView(view) {
    setActiveView(view)
    if (view === 'URL Analyzer') setMode('URL')
    if (view === 'Message Analyzer') setMode('MESSAGE')
  }

  async function analyze(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    const endpoint = mode === 'URL' ? '/api/analyze/url' : '/api/analyze/message'
    const body = mode === 'URL' ? { url: input } : { message: input }
    try {
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'The analyzer rejected this input. Check the format and try again.')
      }
      setResult(await response.json())
    } catch (requestError) {
      setError(requestError.message || 'The backend could not be reached.')
    } finally { setLoading(false) }
  }

  function validateQrFile(file) {
    if (!file) {
      throw new Error('No file selected. Upload a QR image first.')
    }
    if (!qrAcceptTypes.includes(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name || '')) {
      throw new Error('Unsupported file type. Please upload a PNG, JPG, or WebP image.')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('The QR image is too large. Please upload a file smaller than 5 MB.')
    }
    return true
  }

  function handleQrFile(file) {
    try {
      validateQrFile(file)
      setQrError('')
      setQrResult(null)
      setQrFile(file)
      setQrPreview(URL.createObjectURL(file))
    } catch (validationError) {
      setQrFile(null)
      setQrPreview('')
      setQrResult(null)
      setQrError(validationError.message)
    }
  }

  async function analyzeQr() {
    if (!qrFile) {
      setQrError('No file selected. Upload a QR image first.')
      return
    }

    setQrLoading(true)
    setQrError('')
    setQrResult(null)

    const formData = new FormData()
    formData.append('file', qrFile)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/analyze/qr', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'The backend could not analyze the QR image.')
      }
      setQrResult(data)
    } catch (requestError) {
      setQrError(requestError.message || 'The backend could not be reached.')
    } finally {
      setQrLoading(false)
    }
  }

  const isAnalyzer = ['Dashboard', 'URL Analyzer', 'Message Analyzer'].includes(activeView)
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><strong>SHIELD<span>.AI</span></strong><small>DEFENSE CONSOLE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map((item) => <button key={item} type="button" className={`nav-item ${activeView === item ? 'active' : ''}`} onClick={() => selectView(item)}><span aria-hidden="true">{item === 'Dashboard' ? '◈' : item === 'History' ? '◷' : item === 'About' ? '?' : item === 'QR Analyzer' ? '⌗' : '◌'}</span>{item}</button>)}</nav>
      <div className="sidebar-footer"><div className="online"><i /> Engine online</div><small>LOCAL ANALYSIS MODE</small></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><span>SECURITY OPERATIONS</span><b>/</b> {activeView.toUpperCase()}</div><div className="top-meta"><em><i /> LIVE</em><strong>SA</strong></div></header>
      <div className="page-content">
        <section className="page-heading"><div><p className="eyebrow">THREAT INTELLIGENCE / 01</p><h1>{activeView === 'Dashboard' ? 'Good afternoon, analyst.' : activeView}</h1><p>Monitor and neutralize phishing threats before they reach your team.</p></div><time>◷ &nbsp; 08 SEP 2026</time></section>

        {activeView === 'Dashboard' && <section className="stats-grid">{[['TOTAL SCANS', '1,284', '↗ 12.8%', 'teal'], ['SAFE DETECTIONS', '1,019', '↗ 8.4%', 'green'], ['SUSPICIOUS', '187', '— 2.1%', 'amber'], ['DANGEROUS', '78', '↗ 4.6%', 'red']].map(([label, value, trend, color]) => <div className="stat-card" key={label}><small>{label}</small><strong>{value}</strong><em className={color}>{trend} <span>vs last week</span></em><i className={`spark ${color}`} /></div>)}</section>}

        {isAnalyzer && <section className="analysis-layout"><div className="panel analyzer"><div className="panel-heading"><div><p className="eyebrow">REAL-TIME SCAN</p><h2>Analyze a threat</h2></div><span className="private">● PRIVATE</span></div><div className="mode-switch"><button type="button" className={mode === 'URL' ? 'selected' : ''} onClick={() => setMode('URL')}>◉ URL</button><button type="button" className={mode === 'MESSAGE' ? 'selected' : ''} onClick={() => setMode('MESSAGE')}>▤ MESSAGE</button></div><form onSubmit={analyze}><label htmlFor="analysis-input">{mode === 'URL' ? 'SUSPICIOUS URL' : 'MESSAGE CONTENT'}</label>{mode === 'URL' ? <input id="analysis-input" type="url" value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://enter-url-to-scan.com" required /> : <textarea id="analysis-input" rows="5" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste a suspicious message for analysis..." required />}<div className="form-footer"><span>Analysis runs locally. Nothing is opened or sent externally.</span><button className="analyze-button" type="submit" disabled={loading}>{loading ? 'ANALYZING...' : 'ANALYZE INPUT  →'}</button></div></form>{error && <div className="error">{error}</div>}</div><Result result={result} /></section>}

        {activeView === 'QR Analyzer' && <section className="analysis-layout"><div className="panel analyzer"><div className="panel-heading"><div><p className="eyebrow">REAL-TIME SCAN</p><h2>QR destination analysis</h2></div><span className="private">● PRIVATE</span></div><div className="qr-upload-panel">
            <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) handleQrFile(file); }} onClick={() => qrInputRef.current?.click()}>
              <input ref={qrInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) handleQrFile(file); }} />
              <div className="upload-icon">⌁</div>
              <strong>Upload QR Image</strong>
              <small>Drag and drop a QR code or browse from your device.</small>
            </div>
            <div className="qr-preview-wrap">
              {qrPreview ? <img src={qrPreview} alt="QR preview" className="qr-preview" /> : <div className="qr-placeholder">No image selected</div>}
            </div>
            <div className="form-footer qr-buttons">
              <button className="analyze-button secondary" type="button" onClick={() => qrInputRef.current?.click()}>UPLOAD QR IMAGE</button>
              <button className="analyze-button" type="button" disabled={qrLoading || !qrFile} onClick={analyzeQr}>{qrLoading ? 'ANALYZING...' : 'ANALYZE QR →'}</button>
            </div>
            {qrError && <div className="error">{qrError}</div>}
          </div></div><Result result={qrResult} /></section>}

        {activeView === 'Dashboard' && <section className="lower-grid"><div className="panel recent"><div className="panel-heading"><div><p className="eyebrow">ACTIVITY STREAM</p><h2>Recent analyses</h2></div><button className="text-button" type="button" onClick={() => selectView('History')}>VIEW ALL →</button></div><Activity icon="!" label="http://192.0.2.10/login/verify" detail="High-risk phishing URL · 2 min ago" status="DANGEROUS" type="danger" /><Activity icon="✓" label="https://example.com" detail="Safe structural scan · 18 min ago" status="SAFE" type="safe" /><Activity icon="!" label="Training message / account alert" detail="Social engineering scan · 41 min ago" status="SUSPICIOUS" type="warning" /></div><div className="panel distribution"><div className="panel-heading"><div><p className="eyebrow">THREAT MIX</p><h2>Distribution</h2></div><span className="period">7 DAYS⌄</span></div><div className="donut-wrap"><div className="donut"><strong>1,284<small>SCANS</small></strong></div><div className="legend"><span>● Safe <b>79.4%</b></span><span>● Suspicious <b>14.6%</b></span><span>● Dangerous <b>6.0%</b></span></div></div></div></section>}

        {activeView === 'History' && <Placeholder title="Analysis history" text="Persistent scan history will be connected to SQLite after the core analyzers are complete." action="RETURN TO DASHBOARD →" onClick={() => selectView('Dashboard')} />}
        {activeView === 'About' && <Placeholder title="Defensive by design." text="SHIELD.AI analyzes suspicious content locally and transparently. It never opens suspicious pages automatically and is built only for defensive cybersecurity workflows." />}
      </div>
    </main>
  </div>
}

function Result({ result }) {
  if (!result) return <div className="panel result empty"><div className="shield-outline">✦</div><h3>Awaiting analysis</h3><p>Submit a URL or message to see its risk profile here.</p><small>SCORING ENGINE READY</small></div>

  return <div className="panel result"><div className="result-top"><span className={`badge ${result.status.toLowerCase()}`}>{result.status}</span><strong>{result.risk_score}<small>/100</small></strong></div><div className="score-track"><i style={{ width: `${result.risk_score}%` }} /></div>
    {result.decoded_content && <div className="decoded-block"><small>DECODED CONTENT</small><p>{result.decoded_content}</p></div>}
    {result.is_url === false && <div className="qr-note">QR code detected, but it does not contain a URL.</div>}
    <h3>{result.threat_category}</h3>
    <p>{result.explanation}</p>
    <div className="action"><small>RECOMMENDED ACTION</small><b>{result.recommended_action}</b></div>
    <div className="indicators"><small>DETECTED INDICATORS</small>{result.indicators.length ? result.indicators.map((item) => <div key={item.name}><i />{item.name}<em>+{item.points}</em></div>) : <p>No risk indicators detected.</p>}</div>
  </div>
}

function Activity({ icon, label, detail, status, type }) { return <div className="activity"><span className={type}>{icon}</span><div><b>{label}</b><small>{detail}</small></div><em className={`badge ${type === 'danger' ? 'dangerous' : type === 'warning' ? 'suspicious' : 'safe'}`}>{status}</em></div> }
function Placeholder({ title, text, action, onClick }) { return <section className="panel placeholder"><p className="eyebrow">PLATFORM MODULE</p><h2>{title}</h2><p>{text}</p>{action && <button className="analyze-button" type="button" onClick={onClick}>{action}</button>}</section> }

export default App
