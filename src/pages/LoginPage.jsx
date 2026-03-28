import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP, getUserByEmail } from '../lib/supabase'
import { Zap, Mail, KeyRound, ArrowRight, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    // Check user exists in our DB
    const { data: userProfile, error: profileError } = await getUserByEmail(email.trim().toLowerCase())
    if (!userProfile || profileError) {
      setError('No account found with this email. Contact your hackathon organizer.')
      setLoading(false)
      return
    }

    const { error: otpError } = await sendOTP(email.trim().toLowerCase())
    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }

    setStep('otp')
    setLoading(false)
    startCooldown()
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp.trim()) return
    setLoading(true)
    setError('')

    const { data, error: verifyError } = await verifyOTP(email.trim().toLowerCase(), otp.trim())
    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    // Redirect will happen via auth state change in App.jsx
    const { data: profile } = await getUserByEmail(email.trim().toLowerCase())
    if (profile?.role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const startCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    await sendOTP(email.trim().toLowerCase())
    setLoading(false)
    startCooldown()
  }

  return (
    <div className="min-h-screen mesh-bg grid-lines flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(6,182,212,0.1))', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Zap size={26} className="text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'Clash Display' }}>HackFeast</h1>
          <p className="text-[var(--text-muted)] text-sm">Food redemption portal</p>
        </div>

        {/* Card */}
        <div className="card-glow p-8">
          {step === 'email' ? (
            <>
              <div className="mb-7">
                <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
                <p className="text-[var(--text-secondary)] text-sm">Enter your registered email to receive a one-time code.</p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="you@hackfest.dev"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Send code <ArrowRight size={15} /></>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('email'); setError(''); setOtp('') }}
                className="text-[var(--text-muted)] text-sm hover:text-white transition-colors flex items-center gap-1.5 mb-6"
              >
                ← Back
              </button>

              <div className="mb-7">
                <h2 className="text-xl font-semibold text-white mb-1">Check your email</h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                    One-time code
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input-field pl-10 font-mono text-xl tracking-[0.4em] text-center"
                      placeholder="······"
                      required
                      autoFocus
                      maxLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Verify & Sign in <ArrowRight size={15} /></>
                  )}
                </button>

                <p className="text-center text-sm text-[var(--text-muted)]">
                  Didn't get it?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-green-400 hover:text-green-300 disabled:text-[var(--text-muted)] transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                  </button>
                </p>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Not registered? Contact your hackathon organizer.
        </p>
      </div>
    </div>
  )
}
