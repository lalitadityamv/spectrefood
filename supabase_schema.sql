-- ============================================
-- HackFeast Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- Table: users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
  qr_code     TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table: meal_status
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_status (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lunch_day1    BOOLEAN NOT NULL DEFAULT FALSE,
  dinner_day1   BOOLEAN NOT NULL DEFAULT FALSE,
  breakfast_day2 BOOLEAN NOT NULL DEFAULT FALSE,
  snacks        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_status ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (non-role fields)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can update all users
CREATE POLICY "admins_update_all_users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can insert users (for bulk upload)
CREATE POLICY "admins_insert_users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Meal status: users read own
CREATE POLICY "meal_read_own" ON public.meal_status
  FOR SELECT USING (user_id = auth.uid());

-- Meal status: admins read all
CREATE POLICY "meal_admin_read" ON public.meal_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Meal status: admins update all
CREATE POLICY "meal_admin_update" ON public.meal_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Meal status: admins insert
CREATE POLICY "meal_admin_insert" ON public.meal_status
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────
-- Trigger: auto-create meal_status when user is inserted
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_meal_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.meal_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_meal_status();

-- ─────────────────────────────────────────────
-- Trigger: sync Supabase Auth user with our users table on first login
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_auth_user_login()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- If user doesn't exist yet in our table, do nothing (they must be pre-registered)
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- Function: upsert_user_on_login (called from app)
-- ─────────────────────────────────────────────
-- This helps link auth.users to public.users by email
-- The app calls this after OTP verification

-- ─────────────────────────────────────────────
-- Enable Realtime on meal_status
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ─────────────────────────────────────────────
-- Sample Data (optional – remove in production)
-- ─────────────────────────────────────────────
-- INSERT INTO public.users (id, name, email, phone, role, qr_code) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Alice Admin', 'admin@hackfest.dev', '9999999999', 'admin', 'admin-qr-001'),
--   ('00000000-0000-0000-0000-000000000002', 'Bob Builder', 'bob@hackfest.dev', '8888888888', 'participant', 'participant-qr-002');
