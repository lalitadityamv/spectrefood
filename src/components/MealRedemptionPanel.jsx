import { useState } from 'react'
import { redeemMeal } from '../lib/supabase'
import { Coffee, Utensils, Moon, Sandwich, CheckCircle2, Loader2, X } from 'lucide-react'

const MEALS = [
  { key: 'lunch_day1',     label: 'Lunch',     sublabel: 'Day 1',     icon: Utensils, color: '#f59e0b' },
  { key: 'dinner_day1',    label: 'Dinner',    sublabel: 'Day 1',     icon: Moon,     color: '#8b5cf6' },
  { key: 'breakfast_day2', label: 'Breakfast', sublabel: 'Day 2',     icon: Coffee,   color: '#06b6d4' },
  { key: 'snacks',         label: 'Snacks',    sublabel: 'All Day',   icon: Sandwich, color: '#22c55e' },
]

export default function MealRedemptionPanel({ user, mealStatus, onUpdate, onClose }) {
  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState(null)
  const [localStatus, setLocalStatus] = useState(mealStatus || {})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleRedeem = async (mealKey) => {
    if (localStatus[mealKey]) return
    setLoading(prev => ({ ...prev, [mealKey]: true }))

    const { data, error } = await redeemMeal(user.id, mealKey)

    if (error) {
      showToast(error.message || 'Redemption failed', 'error')
    } else {
      const updated = { ...localStatus, [mealKey]: true }
      setLocalStatus(updated)
      if (onUpdate) onUpdate(updated)
      showToast(`${MEALS.find(m => m.key === mealKey)?.label} redeemed!`, 'success')
    }
    setLoading(prev => ({ ...prev, [mealKey]: false }))
  }

  const redeemedCount = MEALS.filter(m => localStatus[m.key]).length

  return (
    <div className="card-glow p-6 relative animate-slide-up">
      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          style={{
            background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
            backdropFilter: 'blur(8px)',
          }}>
          {toast.type === 'success' ? <CheckCircle2 size={14} /> : <X size={14} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Clash Display' }}>
            {user.name}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.email}</p>
          {user.phone && <p className="text-xs text-[var(--text-muted)]">{user.phone}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
            {redeemedCount}/{MEALS.length} redeemed
          </div>
          {onClose && (
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* QR reference */}
      <div className="mb-5 px-3 py-2 rounded-lg font-mono text-xs text-[var(--text-muted)] overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        ID: {user.qr_code?.slice(0, 24)}…
      </div>

      {/* Meal Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {MEALS.map(meal => {
          const redeemed = !!localStatus[meal.key]
          const isLoading = !!loading[meal.key]
          const Icon = meal.icon

          return (
            <button
              key={meal.key}
              onClick={() => handleRedeem(meal.key)}
              disabled={redeemed || isLoading}
              className="flex flex-col items-start p-4 rounded-xl text-left transition-all group"
              style={{
                background: redeemed ? `${meal.color}12` : 'var(--bg-secondary)',
                border: `1px solid ${redeemed ? `${meal.color}30` : 'var(--border)'}`,
                cursor: redeemed ? 'not-allowed' : 'pointer',
                opacity: redeemed ? 1 : 1,
              }}
              onMouseEnter={e => {
                if (!redeemed && !isLoading) {
                  e.currentTarget.style.background = `${meal.color}18`
                  e.currentTarget.style.borderColor = `${meal.color}40`
                }
              }}
              onMouseLeave={e => {
                if (!redeemed && !isLoading) {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: redeemed ? `${meal.color}25` : 'rgba(255,255,255,0.05)' }}>
                  {isLoading ? (
                    <Loader2 size={15} className="animate-spin text-white" />
                  ) : redeemed ? (
                    <CheckCircle2 size={15} style={{ color: meal.color }} />
                  ) : (
                    <Icon size={15} style={{ color: meal.color }} />
                  )}
                </div>
                {redeemed && (
                  <span className="text-xs font-bold" style={{ color: meal.color }}>✓</span>
                )}
              </div>
              <p className="text-sm font-semibold text-white">{meal.label}</p>
              <p className="text-xs" style={{ color: redeemed ? meal.color : 'var(--text-muted)' }}>
                {redeemed ? 'Redeemed' : meal.sublabel}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
