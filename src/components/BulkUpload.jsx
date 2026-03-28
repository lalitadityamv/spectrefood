import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { bulkInsertUsers } from '../lib/supabase'
import { Upload, CheckCircle2, XCircle, FileText, X } from 'lucide-react'

const generateQR = () => crypto.randomUUID()

export default function BulkUpload({ onSuccess, onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = (f) => {
    setFile(f)
    setResult(null)
    setErrors([])
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors: parseErrors }) => {
        if (parseErrors.length) {
          setErrors(parseErrors.map(e => e.message))
          return
        }
        const rows = data.map((row, i) => {
          const name = (row.name || row.Name || '').trim()
          const email = (row.email || row.Email || '').trim().toLowerCase()
          const phone = (row.phone || row.Phone || '').trim()
          const role = (row.role || row.Role || 'participant').trim().toLowerCase()
          const errs = []
          if (!name) errs.push(`Row ${i + 2}: missing name`)
          if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) errs.push(`Row ${i + 2}: invalid email`)
          if (role && !['participant', 'admin'].includes(role)) errs.push(`Row ${i + 2}: role must be participant or admin`)
          return { name, email, phone, role: role || 'participant', qr_code: generateQR(), _errors: errs }
        })
        setErrors(rows.flatMap(r => r._errors))
        setPreview(rows.map(({ _errors, ...r }) => r))
      }
    })
  }

  const handleUpload = async () => {
    if (!preview.length || errors.length) return
    setLoading(true)
    const { data, error } = await bulkInsertUsers(preview)
    setLoading(false)
    if (error) {
      setErrors([error.message])
    } else {
      setResult({ count: data.length })
      if (onSuccess) onSuccess(data)
    }
  }

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-white" style={{ fontFamily: 'Clash Display' }}>Bulk Upload Participants</h3>
        {onClose && (
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Template hint */}
      <div className="mb-4 p-3 rounded-lg text-xs font-mono text-[var(--text-muted)]"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        CSV columns: <span className="text-green-400">name</span>, <span className="text-green-400">email</span>, <span className="text-cyan-400">phone</span> (optional), <span className="text-cyan-400">role</span> (optional)
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4"
        style={{ borderColor: file ? 'rgba(34,197,94,0.4)' : 'var(--border)' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={28} className="text-green-400" />
            <p className="text-sm font-medium text-white">{file.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{preview.length} rows parsed</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Drop your CSV here or <span className="text-green-400">browse</span></p>
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 rounded-lg space-y-1" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle size={11} /> {e}
            </p>
          ))}
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && errors.length === 0 && (
        <div className="mb-4 overflow-auto rounded-xl" style={{ maxHeight: 200, border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                {['Name', 'Email', 'Phone', 'Role'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 8).map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2 text-white">{row.name}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{row.email}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{row.phone || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.role === 'admin' ? 'text-purple-400 bg-purple-400/10' : 'text-green-400 bg-green-400/10'}`}>
                      {row.role}
                    </span>
                  </td>
                </tr>
              ))}
              {preview.length > 8 && (
                <tr><td colSpan={4} className="px-3 py-2 text-[var(--text-muted)] text-center">… and {preview.length - 8} more</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl text-sm font-medium text-green-400"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={16} /> {result.count} participants uploaded successfully!
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading || !preview.length || errors.length > 0 || !!result}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={15} />}
        {loading ? 'Uploading…' : `Upload ${preview.length} participants`}
      </button>
    </div>
  )
}
