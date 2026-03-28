import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, CameraOff } from 'lucide-react'

export default function QRScanner({ onScan, active }) {
  const scannerRef = useRef(null)
  const containerRef = useRef(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!active) {
      stopScanner()
      return
    }
    startScanner()
    return () => stopScanner()
  }, [active])

  const startScanner = async () => {
    if (scannerRef.current) return
    setError('')

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (decodedText) => {
          onScan(decodedText)
        },
        () => {} // ignore decode errors
      )
      setScanning(true)
    } catch (err) {
      setError('Camera access denied or not available. Please allow camera access and try again.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (_) {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  return (
    <div className="relative">
      {/* Scanner container */}
      <div
        id="qr-reader"
        ref={containerRef}
        className="rounded-xl overflow-hidden"
        style={{ minHeight: 240, background: 'var(--bg-secondary)' }}
      />

      {/* Overlay with scan lines */}
      {scanning && (
        <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
          {/* Corner brackets */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {[['top-0 left-0', 'border-t-2 border-l-2'],
                ['top-0 right-0', 'border-t-2 border-r-2'],
                ['bottom-0 left-0', 'border-b-2 border-l-2'],
                ['bottom-0 right-0', 'border-b-2 border-r-2']].map(([pos, cls], i) => (
                <div key={i} className={`absolute ${pos} w-7 h-7 ${cls} border-green-400 rounded-sm`} />
              ))}
              {/* Scan line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-green-400"
                style={{
                  boxShadow: '0 0 8px rgba(34,197,94,0.8)',
                  animation: 'scan 2s linear infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl"
          style={{ background: 'var(--bg-secondary)' }}>
          <CameraOff size={32} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)] text-center px-6 max-w-xs">{error}</p>
        </div>
      )}

      {/* Status badge */}
      {scanning && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(8,12,18,0.85)', border: '1px solid rgba(34,197,94,0.3)', backdropFilter: 'blur(8px)' }}>
          <ScanLine size={12} className="text-green-400" />
          <span className="text-green-400">Scanning…</span>
        </div>
      )}
    </div>
  )
}
