import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'
import { signOut, getMealStatus, supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { LogOut, Coffee, Utensils, Moon, Sandwich, CheckCircle2, Clock, RefreshCw, Zap } from 'lucide-react'

const MEALS = [
  { key: 'lunch_day1',     label: 'Lunch',     sublabel: 'Day 1',     icon: Utensils, color: '#f59e0b' },
  { key: 'dinner_day1',    label: 'Dinner',    sublabel: 'Day 1',     icon: Moon,     color: '#8b5cf6' },
  { key: 'breakfast_day2', label: 'Breakfast', sublabel: 'Day 2',     icon: Coffee,   color: '#06b6d4' },
  { key: 'snacks',         label: 'Snacks',    sublabel: 'All Day',   icon: Sandwich, color: '#22c55e' },
]

export default function ParticipantDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [mealStatus, setMealStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadMealStatus()

    // Realtime subscription
    const sub = supabase
      .channel(`meal-status-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'meal_status',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setMealStatus(payload.new)
      })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [profile])

  const loadMealStatus = async () => {
    setLoading(true)
    const { data } = await getMealStatus(profile.id)
    setMealStatus(data)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const redeemedCount = mealStatus
    ? MEALS.filter(m => mealStatus[m.key]).length : 0

  return (
    <div className="min-h-screen mesh-bg">
      {/* Top Nav */}
      <nav className="border-b border-[var(--border)] sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: 'rgba(8,12,18,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(6,182,212,0.1))', border: '1px solid rgba(34,197,94,0.3)' }}>
              <Zap size={13} className="text-green-400" />
            </div>
            <span className="font-semibold text-white text-sm" style={{ fontFamily: 'Clash Display' }}>HackFeast</span>
          </div>
          <button onClick={handleSignOut} className="btn-ghost flex items-center gap-2 text-sm py-1.5 px-3">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-slide-up">
        {/* Welcome */}
        <div>
          <p className="text-[var(--text-muted)] text-sm mb-0.5">Welcome back</p>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Clash Display' }}>
            {profile?.name || 'Hacker'} 👋
          </h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-1.5">Meals Redeemed</p>
            <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Clash Display' }}>
              {redeemedCount}<span className="text-[var(--text-muted)] text-lg font-normal">/{MEALS.length}</span>
            </p>
          </div>
          <div className="card p-4">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-1.5">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
              <p className="text-green-400 font-semibold text-sm">Active</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="card p-6 flex flex-col items-center">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-4 self-start">Your QR Code</p>
            {profile?.qr_code ? (
              <div className="p-4 rounded-2xl mb-4" style={{ background: 'white' }}>
                <QRCodeSVG
                  value={profile.qr_code}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#080c12"
                  level="H"
                />
              </div>
            ) : (
              <div className="w-[180px] h-[180px] bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center mb-4">
                <RefreshCw size={24} className="text-[var(--text-muted)] animate-spin" />
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] text-center">Show this to the food counter volunteer</p>
            <div className="mt-3 px-3 py-1.5 rounded-lg font-mono text-xs text-green-400"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
              {profile?.qr_code?.slice(0, 18)}…
            </div>
          </div>

          {/* Meal Status */}
          <div className="card p-6">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-4">Meal Status</p>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {MEALS.map(meal => {
                  const redeemed = mealStatus?.[meal.key] ?? false
                  const Icon = meal.icon
                  return (
                    <div key={meal.key} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{
                        background: redeemed ? `${meal.color}12` : 'var(--bg-secondary)',
                        border: `1px solid ${redeemed ? `${meal.color}30` : 'transparent'}`,
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: redeemed ? `${meal.color}20` : 'rgba(255,255,255,0.04)' }}>
                        <Icon size={16} style={{ color: redeemed ? meal.color : 'var(--text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{meal.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{meal.sublabel}</p>
                      </div>
                      {redeemed ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} style={{ color: meal.color }} />
                          <span className="text-xs font-semibold" style={{ color: meal.color }}>Done</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-[var(--text-muted)]" />
                          <span className="text-xs text-[var(--text-muted)]">Pending</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Participant Info */}
        <div className="card p-6">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-4">Your Info</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', value: profile?.name },
              { label: 'Email', value: profile?.email },
              { label: 'Phone', value: profile?.phone || '—' },
              { label: 'Role', value: profile?.role },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">{item.label}</p>
                <p className="text-sm text-white font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
