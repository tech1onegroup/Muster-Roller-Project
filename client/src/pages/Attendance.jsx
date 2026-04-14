import { useState, useEffect, useRef } from 'react'
import { Camera, Check, Image as ImageIcon, X, RefreshCw } from 'lucide-react'
import { uploadGroupPhoto, confirmAttendance, getLaborers } from '../hooks/useApi'

const hasGetUserMedia = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function'

const selectStyle = {
  padding: '8px 12px',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  fontSize: '13px',
  background: 'var(--input)',
  color: 'var(--foreground)',
  width: '100%',
}

export default function Attendance() {
  const [sessionType, setSessionType] = useState('check_in')
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0])
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [results, setResults] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [laborers, setLaborers] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [preview, setPreview] = useState(null) // { file, url }

  useEffect(() => {
    getLaborers({ status: 'active' }).then(setLaborers).catch(() => {})
  }, [])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const startStream = async (mode) => {
    stopStream()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: mode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: 16 / 9 },
      },
      audio: false,
    })
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => {})
    }
  }

  useEffect(() => {
    if (cameraOpen) {
      startStream(facingMode).catch(err => {
        setError('Unable to access camera: ' + (err?.message || err))
        setCameraOpen(false)
        // Fallback to native file input with capture
        cameraInputRef.current?.click()
      })
    } else {
      stopStream()
    }
    return stopStream
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, facingMode])

  const openCamera = () => {
    setError('')
    setSuccess('')
    // Prefer in-page webcam via getUserMedia on any device that supports it —
    // this works on desktop, mobile web, and DevTools mobile emulation.
    // Requires HTTPS (or localhost). Falls back to the native file input with
    // capture="environment" when getUserMedia is unavailable (e.g. insecure
    // context or in-app browsers that block it).
    if (hasGetUserMedia()) {
      setCameraOpen(true)
    } else {
      cameraInputRef.current?.click()
    }
  }

  const openGallery = () => {
    setError('')
    setSuccess('')
    galleryInputRef.current?.click()
  }

  const captureFromVideo = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    // Un-mirror the user-facing camera so the saved photo matches what the user sees
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
    if (!blob) return
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    stopStream()
    setPreview({ file, url })
  }

  const confirmPreview = async () => {
    if (!preview) return
    const file = preview.file
    URL.revokeObjectURL(preview.url)
    setPreview(null)
    setCameraOpen(false)
    await processPhoto(file)
  }

  const retakePreview = async () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
    try { await startStream(facingMode) } catch (err) {
      setError('Unable to access camera: ' + (err?.message || err))
      setCameraOpen(false)
    }
  }

  const flipCamera = () => setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))

  const processPhoto = async (file) => {
    setUploading(true)
    setError('')
    setSuccess('')
    setResults(null)
    const fd = new FormData()
    fd.append('photo', file)
    fd.append('session_type', sessionType)
    fd.append('work_date', workDate)
    try {
      const data = await uploadGroupPhoto(fd)
      const matched = data.faces.filter(f => f.matched && f.laborer_id)
      const unmatched = data.faces.filter(f => !f.matched || !f.laborer_id)

      let autoCount = 0
      if (matched.length > 0) {
        const matches = matched.map(f => ({
          laborer_id: f.laborer_id,
          confidence: f.confidence || 0,
          manual_override: false,
        }))
        const fd2 = new FormData()
        fd2.append('session_id', data.session_id)
        fd2.append('session_type', sessionType)
        fd2.append('work_date', workDate)
        fd2.append('matches', JSON.stringify(matches))
        try {
          const confirmRes = await confirmAttendance(fd2)
          autoCount = confirmRes.confirmed_count ?? matched.length
        } catch (e) {
          setError('Auto-confirm failed: ' + e.message)
        }
      }

      if (unmatched.length > 0) {
        setSessionId(data.session_id)
        setResults(unmatched.map((f, i) => ({
          ...f, index: i,
          selected: false,
          laborer_id: f.laborer_id || '',
          manual_override: false,
        })))
        if (autoCount > 0) {
          setSuccess(`Auto-saved ${autoCount} matched · ${unmatched.length} unknown to label below.`)
        }
      } else {
        setResults(null)
        setSessionId(null)
        if (autoCount > 0) {
          setSuccess(`Auto-saved ${autoCount} ${sessionType === 'check_in' ? 'check-in' : 'check-out'} record${autoCount !== 1 ? 's' : ''}.`)
        } else {
          setError('No faces detected in photo.')
        }
      }
    } catch (e) { setError(e.message) }
    finally { setUploading(false) }
  }

  const handleFilePick = async (e) => {
    const file = e.target.files[0]
    if (file) await processPhoto(file)
    e.target.value = ''
  }

  const updateFace = (index, field, value) => {
    setResults(prev => prev.map((f, i) => {
      if (i !== index) return f
      const updated = { ...f, [field]: value }
      if (field === 'laborer_id') {
        updated.manual_override = true
        updated.selected = !!value
        const lab = laborers.find(l => l.id === value)
        updated.laborer_name = lab ? lab.name : ''
      }
      return updated
    }))
  }

  const handleConfirm = async () => {
    const selected = results.filter(f => f.selected && f.laborer_id)
    if (selected.length === 0) { setError('No faces selected for confirmation'); return }
    setConfirming(true)
    setError('')
    const matches = selected.map(f => ({
      laborer_id: f.laborer_id, confidence: f.confidence || 0, manual_override: f.manual_override || false,
    }))
    const fd = new FormData()
    fd.append('session_id', sessionId)
    fd.append('session_type', sessionType)
    fd.append('work_date', workDate)
    fd.append('matches', JSON.stringify(matches))
    try {
      const data = await confirmAttendance(fd)
      setSuccess(`Confirmed ${data.confirmed_count} attendance records.`)
      setResults(null)
      setSessionId(null)
    } catch (e) { setError(e.message) }
    finally { setConfirming(false) }
  }

  const confidenceColor = (c) => {
    if (c >= 0.8) return { background: '#f0fdf4', color: '#15803d' }
    if (c >= 0.6) return { background: '#fffbeb', color: '#a16207' }
    return { background: '#fef2f2', color: 'var(--destructive)' }
  }

  const selectedCount = results ? results.filter(f => f.selected).length : 0

  return (
    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '160px' }}>
      <h2 className="mb-5 sm:mb-8" style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: 500 }}>
        Attendance
      </h2>

      {/* Controls — equal-height segmented buttons + date input */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-5 mb-5 sm:mb-8 sm:items-end">
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Type</label>
          <div className="flex" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', height: '48px' }}>
            {['check_in', 'check_out'].map(t => (
              <button
                key={t}
                onClick={() => setSessionType(t)}
                className="text-sm font-medium flex-1 sm:flex-none"
                style={{
                  background: sessionType === t ? 'var(--primary)' : 'var(--card)',
                  color: sessionType === t ? 'var(--primary-foreground)' : 'var(--foreground)',
                  padding: '0 24px',
                  whiteSpace: 'nowrap',
                  border: 'none',
                  height: '100%',
                }}
              >
                {t === 'check_in' ? 'Check In' : 'Check Out'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 sm:flex-none">
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Date</label>
          <input
            type="date"
            value={workDate}
            onChange={e => setWorkDate(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 14px',
              border: '1px solid var(--input-border)',
              borderRadius: '12px',
              background: 'var(--input)',
              color: 'var(--foreground)',
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 text-sm font-medium" style={{ background: '#fef2f2', color: 'var(--destructive)', borderRadius: '12px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 text-sm font-medium" style={{ background: '#f0fdf4', color: '#15803d', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          {success}
        </div>
      )}

      {/* Empty state — the whole card is a camera trigger */}
      {!results && !uploading && (
        <div
          role="button"
          tabIndex={0}
          onClick={openCamera}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCamera() } }}
          aria-label="Open camera to capture"
          className="card-elevated w-full"
          style={{
            border: '2px dashed var(--border)', borderRadius: '24px',
            padding: '56px 24px', textAlign: 'center', background: 'var(--card)',
            cursor: 'pointer',
            display: 'block',
          }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 96, height: 96, borderRadius: '999px',
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            marginBottom: '20px',
            boxShadow: '0 10px 24px rgba(118,34,36,0.28)',
          }}>
            <Camera size={44} strokeWidth={2} />
          </span>
          <p className="text-base mb-1.5" style={{ fontWeight: 600, color: 'var(--foreground)' }}>
            Tap anywhere here to open camera
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Matched faces are saved instantly to {sessionType === 'check_in' ? 'check-in' : 'check-out'}
          </p>
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); openGallery() }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); openGallery() } }}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
            style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', borderRadius: '12px', minHeight: '44px', cursor: 'pointer' }}
          >
            <ImageIcon size={16} /> Or pick from gallery
          </span>
        </div>
      )}

      {uploading && (
        <div className="card-elevated" style={{
          borderRadius: '24px', padding: '48px 24px', textAlign: 'center', background: 'var(--card)',
        }}>
          <p className="text-base" style={{ fontWeight: 500, color: 'var(--foreground)' }}>Processing photo…</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Detecting and matching faces</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          <h3 className="mb-1" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>
            Unknown faces — tap to label
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {results.length} unknown &bull; {selectedCount} selected
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setResults(prev => prev.map(f => ({ ...f, selected: true })))}
                className="px-3 py-2 text-xs font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '10px', minHeight: '36px' }}>
                All
              </button>
              <button onClick={() => setResults(prev => prev.map(f => ({ ...f, selected: false })))}
                className="px-3 py-2 text-xs font-medium"
                style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', borderRadius: '10px', minHeight: '36px' }}>
                None
              </button>
              <button onClick={() => { setResults(null); setSessionId(null) }}
                className="text-xs font-medium px-3 py-2" style={{ color: 'var(--accent)', minHeight: '36px' }}>
                New
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {results.map((face, i) => (
              <div key={i} style={{
                background: 'var(--card)',
                border: face.selected ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: face.selected ? '0 0 0 3px rgba(118,34,36,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', background: 'var(--muted)', marginBottom: '10px', overflow: 'hidden' }}>
                  {face.thumbnail ? (
                    <img src={`data:image/jpeg;base64,${face.thumbnail}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No preview</div>
                  )}
                </div>

                {face.matched && (
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '24px', fontSize: '11px', fontWeight: 500, marginBottom: '6px', ...confidenceColor(face.confidence) }}>
                    {Math.round(face.confidence * 100)}%
                  </span>
                )}

                <select value={face.laborer_id} onChange={e => updateFace(i, 'laborer_id', e.target.value)} style={selectStyle}>
                  <option value="">— Unknown —</option>
                  {laborers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>

                <label className="flex items-center gap-2 mt-2 cursor-pointer" style={{ minHeight: '32px' }}>
                  <input type="checkbox" checked={face.selected} onChange={e => updateFace(i, 'selected', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Include</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky bottom confirm bar (only with results) */}
      {results && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 25,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom)) 16px',
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -8px 20px rgba(0,0,0,0.06)',
        }}>
          <div className="max-w-4xl mx-auto">
            <button onClick={handleConfirm} disabled={confirming || selectedCount === 0}
              className="w-full py-3.5 font-medium text-sm flex items-center justify-center gap-2"
              style={{
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                borderRadius: '16px',
                opacity: confirming || selectedCount === 0 ? 0.5 : 1,
                minHeight: '52px',
              }}>
              <Check size={20} />
              {confirming ? 'Confirming…' : `Confirm ${sessionType === 'check_in' ? 'Check-In' : 'Check-Out'} (${selectedCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Webcam modal (desktop/web) */}
      {cameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {preview ? (
              <img
                src={preview.url}
                alt="Captured preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px',
            padding: 'calc(20px + env(safe-area-inset-bottom)) 20px 20px',
          }}>
            {preview ? (
              <>
                <button
                  onClick={retakePreview}
                  className="flex items-center gap-2"
                  style={{
                    padding: '0 22px', height: 56, borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500,
                  }}
                >
                  <RefreshCw size={18} /> Retake
                </button>
                <button
                  onClick={confirmPreview}
                  className="flex items-center gap-2"
                  style={{
                    padding: '0 26px', height: 64, borderRadius: 999,
                    background: '#fff', color: '#000',
                    border: '4px solid rgba(255,255,255,0.35)',
                    cursor: 'pointer', fontSize: 16, fontWeight: 600,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                  }}
                >
                  <Check size={22} /> Upload
                </button>
                <button
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview.url)
                    setPreview(null)
                    setCameraOpen(false)
                  }}
                  aria-label="Close"
                  style={{
                    width: 56, height: 56, borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={24} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCameraOpen(false)}
                  aria-label="Close camera"
                  style={{
                    width: 56, height: 56, borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={24} />
                </button>
                <button
                  onClick={captureFromVideo}
                  aria-label="Capture photo"
                  style={{
                    width: 84, height: 84, borderRadius: 999,
                    background: '#fff', color: '#000',
                    border: '4px solid rgba(255,255,255,0.35)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                  }}
                >
                  <Camera size={34} strokeWidth={2.2} />
                </button>
                <button
                  onClick={flipCamera}
                  aria-label="Switch camera"
                  style={{
                    width: 56, height: 56, borderRadius: 999,
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilePick}
        style={{ display: 'none' }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePick}
        style={{ display: 'none' }}
      />

    </div>
  )
}
