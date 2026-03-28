import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signOut, getUserByQR, getAllUsers, supabase, ensureMealStatusRow } from '../lib/supabase'
import QRScanner from '../components/QRScanner'
import MealRedemptionPanel from '../components/MealRedemptionPanel'
import BulkUpload from '../components/BulkUpload'
import {
  LogOut, Scan, Users, Search, Upload, Zap,
  RefreshCw, Coffee, Utensils, Moon, Sandwich, X, ChevronRight
} from 'lucide-react'

const TABS = [
  { id: 'scanner', label: 'Scanner', icon: Scan },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'upload', label: 'Upload CSV', icon: Upload },
]

const MEAL_KEYS = ['lunch_day1', 'dinner_day1', 'breakfast_day2', 'snacks']
const MEAL_ICONS = { lunch_day1: Utensils, dinner_day1: Moon, breakfast_day2: Coffee, snacks: Sandwich }
const MEAL_COLORS = { lunch_day1: '#f59e0b', dinner_day1: '#8b5cf6', breakfast_day2: '#06b6d4', snacks: '#22c55e' }
const MEAL_LABELS = { lunch_day1: 'Lunch', dinner_day1: 'Dinner', breakfast_day2: 'Breakfast', snacks: 'Snacks' }

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('scanner')

  // Scanner state
  const [scanActive, setScanActive] = useState(false)
  const [scannedUser, setScannedUser] = useState(null)
  const [scanError, setScanError] = useState('')
  const [lastScan, setLastScan] = useState('')

  // Participants state
  const [participants, setParticipants] = useState([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  // Stats
  const [stats, setStats] = useState({ total: 0, lunch: 0, dinner: 0, breakfast: 0, snacks: 0 })

  useEffect(() => {
    loadParticipants()
    // Realtime updates
    const sub = supabase
      .channel('admin-meal-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_status' }, () => {
        loadParticipants(search)
      })
      .subscribe()
    return () => sub.unsubscribe()
  }, [])

  const loadParticipants = useCallback(async (q = search) => {
    setLoadingParticipants(true)
    const { data } = await getAllUsers(q)
    if (data) {
      setParticipants(data)
      // Compute stats
      const total = data.length
      const s = { total, lunch: 0, dinner: 0, breakfast: 0, snacks: 0 }
      data.forEach(u => {
        if (u.meal_status?.lunch_day1) s.lunch++
        if (u.meal_status?.dinner_day1) s.dinner++
        if (u.meal_status?.breakfast_day2) s.breakfast++
        if (u.meal_status?.snacks) s.snacks++
      })
      setStats(s)
    }
    setLoadingParticipants(false)
  }, [search])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(window._searchTimer)
    window._searchTimer = setTimeout(() => loadParticipants(val), 300)
  }

  const handleQRScan = async (text) => {
    if (text === lastScan) return
    setLastScan(text)
    setScanActive(false)
    setScanError('')

    const { data: user, error } = await getUserByQR(text)
    if (error || !user) {
      setScanError(`QR code not recognized: "${text.slice(0, 30)}…"`)
      setScannedUser(null)
      return
    }
    // Ensure meal_status row exists
    await ensureMealStatusRow(user.id)
    const freshUser = { ...user }
    setScannedUser(freshUser)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleMealUpdate = (userId, updatedStatus) => {
    setParticipants(prev => prev.map(p =>
      p.id === userId ? { ...p, meal_status: { ...p.meal_status, ...updatedStatus } } : p
    ))
    if (scannedUser?.id === userId) {
      setScannedUser(prev => ({ ...prev, meal_status: { ...prev.meal_status, ...updatedStatus } }))
    }
  }

  const pct = (n) => stats.total ? Math.round((n / stats.total) * 100) : 0

  return (
    <div className="min-h-screen mesh-bg">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: 'rgba(8,12,18,0.9)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(6,182,212,0.1))', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Zap size={13} className="text-green-400" />
            </div>
            <span className="font-semibold text-white text-sm" style={{ fontFamily: 'Clash Display' }}>HackFeast</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/20">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)] hidden sm:block">{profile?.name}</span>
            <button onClick={handleSignOut} className="btn-ghost flex items-center gap-2 text-sm py-1.5 px-3">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-slide-up">
          {[
            { label: 'Lunch', count: stats.lunch, icon: Utensils, color: '#f59e0b' },
            { label: 'Dinner', count: stats.dinner, icon: Moon, color: '#8b5cf6' },
            { label: 'Breakfast', count: stats.breakfast, icon: Coffee, color: '#06b6d4' },
            { label: 'Snacks', count: stats.snacks, icon: Sandwich, color: '#22c55e' },
          ].map(s => {
            const Icon = s.icon
            const p = pct(s.count)
            return (
              <div key={s.label} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
                  <Icon size={13} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold text-white mb-0.5" style={{ fontFamily: 'Clash Display' }}>
                  {s.count}<span className="text-[var(--text-muted)] text-sm font-normal">/{stats.total}</span>
                </p>
                {/* Progress bar */}
                <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: s.color }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? 'var(--bg-card-hover)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: active ? '1px solid var(--border)' : '1px solid transparent',
                }}>
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab: Scanner */}
        {tab === 'scanner' && (
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
            <div>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-white" style={{ fontFamily: 'Clash Display' }}>QR Scanner</h2>
                  <button
                    onClick={() => { setScanActive(!scanActive); setScanError(''); setLastScan('') }}
                    className={scanActive ? 'btn-ghost text-sm py-1.5 px-3' : 'btn-primary text-sm py-1.5 px-3'}
                  >
                    {scanActive ? 'Stop' : 'Start Scanner'}
                  </button>
                </div>

                <QRScanner active={scanActive} onScan={handleQRScan} />

                {scanError && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl text-sm"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <X size={14} className="mt-0.5 shrink-0" />
                    {scanError}
                  </div>
                )}

                {!scanActive && !scannedUser && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-[var(--text-muted)]">Press <strong className="text-white">Start Scanner</strong> and point camera at a participant's QR code.</p>
                  </div>
                )}
              </div>

              {/* Manual search by QR */}
              <div className="card p-4 mt-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-3">Manual QR Lookup</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste QR code value…"
                    id="manual-qr-input"
                    className="input-field text-sm"
                  />
                  <button
                    onClick={() => {
                      const val = document.getElementById('manual-qr-input').value.trim()
                      if (val) handleQRScan(val)
                    }}
                    className="btn-primary shrink-0 text-sm py-2 px-4">
                    Look up
                  </button>
                </div>
              </div>
            </div>

            {/* Redemption panel */}
            <div>
              {scannedUser ? (
                <MealRedemptionPanel
                  user={scannedUser}
                  mealStatus={scannedUser.meal_status}
                  onUpdate={(updated) => handleMealUpdate(scannedUser.id, updated)}
                  onClose={() => { setScannedUser(null); setLastScan('') }}
                />
              ) : (
                <div className="card h-full min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <Scan size={28} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">No QR scanned yet</p>
                    <p className="text-sm text-[var(--text-muted)]">Scan a participant's QR code to view their profile and redeem meals.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Participants */}
        {tab === 'participants' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by name, email or phone…"
                  className="input-field pl-9 text-sm"
                />
              </div>
              <button onClick={() => loadParticipants(search)} className="btn-ghost text-sm py-2 px-3 flex items-center gap-2">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: 'var(--bg-secondary)' }}>
                    <tr>
                      {['Name', 'Email', 'Phone', 'Role', 'Lunch', 'Dinner', 'Breakfast', 'Snacks', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingParticipants ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-secondary)', width: j === 0 ? 120 : 60 }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : participants.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-[var(--text-muted)] text-sm">No participants found</td></tr>
                    ) : participants.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white whitespace-nowrap">{p.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{p.email}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{p.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${p.role === 'admin' ? 'text-purple-400 bg-purple-400/10' : 'text-green-400 bg-green-400/10'}`}>
                            {p.role}
                          </span>
                        </td>
                        {MEAL_KEYS.map(k => {
                          const redeemed = p.meal_status?.[k]
                          return (
                            <td key={k} className="px-4 py-3">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: redeemed ? `${MEAL_COLORS[k]}20` : 'var(--bg-secondary)' }}>
                                <div className="w-2 h-2 rounded-full" style={{ background: redeemed ? MEAL_COLORS[k] : 'var(--text-muted)' }} />
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedUser(p)}
                            className="text-[var(--text-muted)] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)]">
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-3 text-xs text-[var(--text-muted)]">{participants.length} participant{participants.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}

        {/* Tab: Upload */}
        {tab === 'upload' && (
          <div className="max-w-xl animate-fade-in">
            <BulkUpload onSuccess={() => { loadParticipants(); setTab('participants') }} />
          </div>
        )}
      </div>

      {/* Participant detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <MealRedemptionPanel
              user={selectedUser}
              mealStatus={selectedUser.meal_status}
              onUpdate={(updated) => {
                handleMealUpdate(selectedUser.id, updated)
                setSelectedUser(prev => ({ ...prev, meal_status: { ...prev.meal_status, ...updated } }))
              }}
              onClose={() => setSelectedUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
