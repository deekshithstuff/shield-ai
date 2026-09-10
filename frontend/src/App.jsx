import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const navigation = ['Dashboard', 'URL Analyzer', 'Message Analyzer', 'QR Analyzer', 'History', 'About']
const qrAcceptTypes = ['image/png', 'image/jpeg', 'image/webp']
const emptyStats = {
  total_scans: 0,
  safe_count: 0,
  suspicious_count: 0,
  dangerous_count: 0,
  url_count: 0,
  message_count: 0,
  qr_count: 0,
}

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
  const [dashboardStats, setDashboardStats] = useState(emptyStats)
  const [historyRecords, setHistoryRecords] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [historyStatus, setHistoryStatus] = useState('ALL')
  const [historyType, setHistoryType] = useState('ALL')
  const [historySort, setHistorySort] = useState('newest')
  const [selectedHistoryId, setSelectedHistoryId] = useState(null)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null)
  const qrInputRef = useRef(null)

  function selectView(view) {
    setActiveView(view)
    if (view === 'URL Analyzer') setMode('URL')
    if (view === 'Message Analyzer') setMode('MESSAGE')
  }

  async function refreshDashboardStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`)
      if (!response.ok) throw new Error('Could not load stats')
      const data = await response.json()
      setDashboardStats({ ...emptyStats, ...data })
    } catch {
      setDashboardStats(emptyStats)
    }
  }

  async function refreshHistory() {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const params = new URLSearchParams()
      if (historySearch.trim()) params.set('search', historySearch.trim())
      if (historyStatus !== 'ALL') params.set('status', historyStatus)
      if (historyType !== 'ALL') params.set('type', historyType)
      if (historySort) params.set('sort', historySort)

      const response = await fetch(`${API_BASE_URL}/api/analyses?${params.toString()}`)
      if (!response.ok) throw new Error('Could not load history')
      const data = await response.json()
      setHistoryRecords(data)
      if (data.length > 0 && (!selectedHistoryId || !data.some((record) => record.id === selectedHistoryId))) {
        setSelectedHistoryId(data[0].id)
        setSelectedHistoryDetail(data[0])
      }
      if (data.length === 0) {
        setSelectedHistoryId(null)
        setSelectedHistoryDetail(null)
      }
    } catch (requestError) {
      setHistoryError(requestError.message || 'History could not be loaded.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    refreshDashboardStats()
  }, [])

  useEffect(() => {
    if (activeView === 'History') {
      refreshHistory()
    }
  }, [activeView, historySearch, historyStatus, historyType, historySort])

  async function loadHistoryDetail(analysisId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyses/${analysisId}`)
      if (!response.ok) throw new Error('Unable to load detail.')
      const data = await response.json()
      setSelectedHistoryId(analysisId)
      setSelectedHistoryDetail(data)
    } catch (requestError) {
      setHistoryError(requestError.message || 'Unable to load detail.')
    }
  }

  async function clearHistory() {
    if (!window.confirm('Clear all saved analysis history?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyses`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'Unable to clear history.')
      }
      setHistoryRecords([])
      setSelectedHistoryId(null)
      setSelectedHistoryDetail(null)
      await refreshDashboardStats()
    } catch (requestError) {
      setHistoryError(requestError.message || 'Unable to clear history.')
    }
  }

  async function analyze(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    const endpoint = mode === 'URL' ? '/api/analyze/url' : '/api/analyze/message'
    const body = mode === 'URL' ? { url: input } : { message: input }
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || 'The analyzer rejected this input. Check the format and try again.')
      }
      const data = await response.json()
      setResult(data)
      await refreshDashboardStats()
      if (activeView === 'History') await refreshHistory()
    } catch (requestError) {
      setError(requestError.message || 'The backend could not be reached.')
    } finally {
      setLoading(false)
    }
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
      const response = await fetch(`${API_BASE_URL}/api/analyze/qr`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || 'The backend could not analyze the QR image.')
      }
      setQrResult(data)
      await refreshDashboardStats()
      if (activeView === 'History') await refreshHistory()
    } catch (requestError) {
      setQrError(requestError.message || 'The backend could not be reached.')
    } finally {
      setQrLoading(false)
    }
  }

  const isAnalyzer = ['Dashboard', 'URL Analyzer', 'Message Analyzer'].includes(activeView)
  const stats = dashboardStats
  const safePercent = stats.total_scans ? (stats.safe_count / stats.total_scans) * 100 : 0
  const suspiciousPercent = stats.total_scans ? (stats.suspicious_count / stats.total_scans) * 100 : 0
  const dangerousPercent = stats.total_scans ? (stats.dangerous_count / stats.total_scans) * 100 : 0
  const donutBackground = stats.total_scans
    ? `conic-gradient(var(--green) 0 ${safePercent}%, var(--amber) ${safePercent}% ${safePercent + suspiciousPercent}%, var(--red) ${safePercent + suspiciousPercent}% 100%)`
    : 'conic-gradient(#1e2d30 0 100%)'
  const recentThreats = historyRecords.slice(0, 3)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>SHIELD<span>.AI</span></strong>
            <small>DEFENSE CONSOLE</small>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activeView === item ? 'active' : ''}`}
              onClick={() => selectView(item)}
            >
              <span aria-hidden="true">{item === 'Dashboard' ? '◈' : item === 'History' ? '◷' : item === 'About' ? '?' : item === 'QR Analyzer' ? '⌗' : '◌'}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="online"><i /> Engine online</div>
          <small>LOCAL ANALYSIS MODE</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span>SECURITY OPERATIONS</span>
            <b>/</b>
            {activeView.toUpperCase()}
          </div>
          <div className="top-meta">
            <em><i /> LIVE</em>
            <strong>SA</strong>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">THREAT INTELLIGENCE / 01</p>
              <h1>{activeView === 'Dashboard' ? 'Good afternoon, analyst.' : activeView}</h1>
              <p>Monitor and neutralize phishing threats before they reach your team.</p>
            </div>
            <time>◷ &nbsp; {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</time>
          </section>

          {activeView === 'Dashboard' && (
            <>
              {stats.total_scans === 0 ? (
                <div className="empty-state large">No security analyses yet.<br />Start by analyzing a URL, message, or QR code.</div>
              ) : (
                <section className="stats-grid">
                  {[
                    ['TOTAL SCANS', stats.total_scans, 'LIVE DATA', 'teal'],
                    ['SAFE', stats.safe_count, `${Math.round(safePercent)}%`, 'green'],
                    ['SUSPICIOUS', stats.suspicious_count, `${Math.round(suspiciousPercent)}%`, 'amber'],
                    ['DANGEROUS', stats.dangerous_count, `${Math.round(dangerousPercent)}%`, 'red'],
                  ].map(([label, value, trend, color]) => (
                    <div className="stat-card" key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                      <em className={color}>{trend}<span>of scans</span></em>
                      <i className={`spark ${color}`} />
                    </div>
                  ))}
                </section>
              )}

              <section className="quick-actions">
                <button type="button" className="analyze-button" onClick={() => selectView('URL Analyzer')}>Analyze URL</button>
                <button type="button" className="analyze-button secondary" onClick={() => selectView('Message Analyzer')}>Analyze Message</button>
                <button type="button" className="analyze-button secondary" onClick={() => selectView('QR Analyzer')}>Analyze QR</button>
              </section>

              {stats.total_scans > 0 && (
                <section className="lower-grid">
                  <div className="panel recent">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">ACTIVITY STREAM</p>
                        <h2>Recent analyses</h2>
                      </div>
                      <button className="text-button" type="button" onClick={() => selectView('History')}>VIEW ALL →</button>
                    </div>
                    {recentThreats.length === 0 ? (
                      <div className="empty-state small">No analyses yet.</div>
                    ) : (
                      recentThreats.map((record) => (
                        <button key={record.id} type="button" className="activity-button" onClick={() => { setSelectedHistoryId(record.id); loadHistoryDetail(record.id); selectView('History'); }}>
                          <div className="activity">
                            <span className={record.status.toLowerCase() === 'dangerous' ? 'danger' : record.status.toLowerCase() === 'suspicious' ? 'warning' : 'safe'}>{record.status.toLowerCase() === 'dangerous' ? '!' : record.status.toLowerCase() === 'suspicious' ? '!' : '✓'}</span>
                            <div>
                              <b>{record.analysis_type}: {shortenText(record.input_summary, 42)}</b>
                              <small>{record.threat_category} · {formatTimestamp(record.created_at)}</small>
                            </div>
                            <em className={`badge ${record.status.toLowerCase()}`}>{record.status}</em>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="panel distribution">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">THREAT MIX</p>
                        <h2>Distribution</h2>
                      </div>
                      <span className="period">LIVE</span>
                    </div>
                    <div className="donut-wrap">
                      <div className="donut" style={{ background: donutBackground }}>
                        <strong>{stats.total_scans}<small>SCANS</small></strong>
                      </div>
                      <div className="legend">
                        <span>● Safe <b>{stats.total_scans ? Math.round(safePercent) : 0}%</b></span>
                        <span>● Suspicious <b>{stats.total_scans ? Math.round(suspiciousPercent) : 0}%</b></span>
                        <span>● Dangerous <b>{stats.total_scans ? Math.round(dangerousPercent) : 0}%</b></span>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {isAnalyzer && (
            <section className="analysis-layout">
              <div className="panel analyzer">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">REAL-TIME SCAN</p>
                    <h2>Analyze a threat</h2>
                  </div>
                  <span className="private">● PRIVATE</span>
                </div>
                <div className="mode-switch">
                  <button type="button" className={mode === 'URL' ? 'selected' : ''} onClick={() => setMode('URL')}>◉ URL</button>
                  <button type="button" className={mode === 'MESSAGE' ? 'selected' : ''} onClick={() => setMode('MESSAGE')}>▤ MESSAGE</button>
                </div>
                <form onSubmit={analyze}>
                  <label htmlFor="analysis-input">{mode === 'URL' ? 'SUSPICIOUS URL' : 'MESSAGE CONTENT'}</label>
                  {mode === 'URL' ? (
                    <input id="analysis-input" type="url" value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://enter-url-to-scan.com" required />
                  ) : (
                    <textarea id="analysis-input" rows="5" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste a suspicious message for analysis..." required />
                  )}
                  <div className="form-footer">
                    <span>Analysis runs locally. Nothing is opened or sent externally.</span>
                    <button className="analyze-button" type="submit" disabled={loading}>{loading ? 'ANALYZING...' : 'ANALYZE INPUT  →'}</button>
                  </div>
                </form>
                {error && <div className="error">{error}</div>}
              </div>
              <Result result={result} />
            </section>
          )}

          {activeView === 'QR Analyzer' && (
            <section className="analysis-layout">
              <div className="panel analyzer">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">REAL-TIME SCAN</p>
                    <h2>QR destination analysis</h2>
                  </div>
                  <span className="private">● PRIVATE</span>
                </div>
                <div className="qr-upload-panel">
                  <div
                    className="upload-dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      const file = event.dataTransfer.files?.[0]
                      if (file) handleQrFile(file)
                    }}
                    onClick={() => qrInputRef.current?.click()}
                  >
                    <input
                      ref={qrInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleQrFile(file)
                      }}
                    />
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
                </div>
              </div>
              <Result result={qrResult} />
            </section>
          )}

          {activeView === 'History' && (
            <section className="panel history-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">THREAT INTELLIGENCE</p>
                  <h2>Analysis History</h2>
                </div>
                <button className="danger-button" type="button" onClick={clearHistory}>CLEAR HISTORY</button>
              </div>

              <div className="history-toolbar">
                <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search by URL or keyword" />
                <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
                  <option value="ALL">All status</option>
                  <option value="SAFE">SAFE</option>
                  <option value="SUSPICIOUS">SUSPICIOUS</option>
                  <option value="DANGEROUS">DANGEROUS</option>
                </select>
                <select value={historyType} onChange={(event) => setHistoryType(event.target.value)}>
                  <option value="ALL">All type</option>
                  <option value="URL">URL</option>
                  <option value="MESSAGE">MESSAGE</option>
                  <option value="QR">QR</option>
                </select>
                <select value={historySort} onChange={(event) => setHistorySort(event.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              {historyError && <div className="error">{historyError}</div>}

              {historyLoading ? (
                <div className="empty-state">Loading analysis history…</div>
              ) : historyRecords.length === 0 ? (
                <div className="empty-state">No analysis history available.</div>
              ) : (
                <div className="history-layout">
                  <div className="history-table-wrap">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Input</th>
                          <th>Risk</th>
                          <th>Status</th>
                          <th>Threat</th>
                          <th>Time</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRecords.map((record) => (
                          <tr key={record.id} className={selectedHistoryId === record.id ? 'selected-row' : ''} onClick={() => loadHistoryDetail(record.id)}>
                            <td>#{record.id}</td>
                            <td>{record.analysis_type}</td>
                            <td>{shortenText(record.input_summary, 48)}</td>
                            <td>{record.risk_score}</td>
                            <td><span className={`badge ${record.status.toLowerCase()}`}>{record.status}</span></td>
                            <td>{shortenText(record.threat_category, 32)}</td>
                            <td>{formatTimestamp(record.created_at)}</td>
                            <td>
                              <button type="button" className="text-button compact" onClick={(event) => { event.stopPropagation(); loadHistoryDetail(record.id); }}>VIEW</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="history-detail-panel">
                    {selectedHistoryDetail ? (
                      <Result result={toResultCard(selectedHistoryDetail)} />
                    ) : (
                      <div className="empty-state detail-empty">Select an analysis to view details.</div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeView === 'About' && (
            <Placeholder
              title="Defensive by design."
              text="SHIELD.AI analyzes suspicious content locally and transparently. It never opens suspicious pages automatically and is built only for defensive cybersecurity workflows."
            />
          )}
        </div>
      </main>
    </div>
  )
}

function Result({ result }) {
  if (!result) return <div className="panel result empty"><div className="shield-outline">✦</div><h3>Awaiting analysis</h3><p>Submit a URL or message to see its risk profile here.</p><small>SCORING ENGINE READY</small></div>

  return (
    <div className="panel result">
      <div className="result-top">
        <span className={`badge ${result.status.toLowerCase()}`}>{result.status}</span>
        <strong>{result.risk_score}<small>/100</small></strong>
      </div>
      <div className="score-track"><i style={{ width: `${result.risk_score}%` }} /></div>
      {result.decoded_content && (
        <div className="decoded-block">
          <small>DECODED CONTENT</small>
          <p>{result.decoded_content}</p>
        </div>
      )}
      {result.is_url === false && <div className="qr-note">QR code detected, but it does not contain a URL.</div>}
      <h3>{result.threat_category}</h3>
      <p>{result.explanation}</p>
      <div className="action">
        <small>RECOMMENDED ACTION</small>
        <b>{result.recommended_action}</b>
      </div>
      <div className="indicators">
        <small>DETECTED INDICATORS</small>
        {result.indicators && result.indicators.length ? (
          result.indicators.map((item) => <div key={`${item.name}-${item.points}`}><i />{item.name}<em>+{item.points}</em></div>)
        ) : (
          <p>No risk indicators detected.</p>
        )}
      </div>
    </div>
  )
}

function Activity({ icon, label, detail, status, type }) {
  return (
    <div className="activity">
      <span className={type}>{icon}</span>
      <div>
        <b>{label}</b>
        <small>{detail}</small>
      </div>
      <em className={`badge ${type === 'danger' ? 'dangerous' : type === 'warning' ? 'suspicious' : 'safe'}`}>{status}</em>
    </div>
  )
}

function Placeholder({ title, text, action, onClick }) {
  return (
    <section className="panel placeholder">
      <p className="eyebrow">PLATFORM MODULE</p>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && <button className="analyze-button" type="button" onClick={onClick}>{action}</button>}
    </section>
  )
}

function shortenText(value, maxLength = 80) {
  if (!value) return '—'
  const text = String(value).trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function formatTimestamp(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toResultCard(record) {
  return {
    status: record.status,
    risk_score: record.risk_score,
    threat_category: record.threat_category,
    explanation: record.explanation,
    recommended_action: record.recommendation,
    indicators: Array.isArray(record.indicators) ? record.indicators : [],
    decoded_content: record.input_summary,
    is_url: record.analysis_type !== 'MESSAGE',
  }
}

export default App
