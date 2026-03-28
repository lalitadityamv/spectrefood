import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Replace these with your actual Supabase project credentials
// Get them from: https://supabase.com/dashboard → Settings → API
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

export const sendOTP = async (email) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }, // Only allow pre-registered users
  })
  return { data, error }
}

export const verifyOTP = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// User helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  return { data, error }
}

export const getUserByQR = async (qrCode) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, meal_status(*)')
    .eq('qr_code', qrCode)
    .single()
  return { data, error }
}

export const getAllUsers = async (search = '') => {
  let query = supabase
    .from('users')
    .select('*, meal_status(*)')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`email.ilike.%${search}%,phone.ilike.%${search}%,name.ilike.%${search}%`)
  }

  const { data, error } = await query
  return { data, error }
}

export const insertUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()
  return { data, error }
}

export const bulkInsertUsers = async (users) => {
  const { data, error } = await supabase
    .from('users')
    .insert(users)
    .select()
  return { data, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// Meal helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getMealStatus = async (userId) => {
  const { data, error } = await supabase
    .from('meal_status')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}

export const redeemMeal = async (userId, mealField) => {
  // First check if already redeemed
  const { data: current } = await getMealStatus(userId)
  if (current && current[mealField] === true) {
    return { data: null, error: { message: 'Meal already redeemed' } }
  }

  const { data, error } = await supabase
    .from('meal_status')
    .update({ [mealField]: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  return { data, error }
}

export const ensureMealStatusRow = async (userId) => {
  const { data: existing } = await getMealStatus(userId)
  if (!existing) {
    const { data, error } = await supabase
      .from('meal_status')
      .insert({ user_id: userId })
      .select()
      .single()
    return { data, error }
  }
  return { data: existing, error: null }
}
