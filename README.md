# 🍽️ HackFeast — Hackathon Food Redemption Portal

A production-ready food redemption system for hackathons. Built with React (Vite), Supabase, and Tailwind CSS.

---

## ✨ Features

### Participant
- Email OTP login (no passwords)
- Personal QR code display
- Real-time meal status dashboard
- See which meals are redeemed / pending

### Admin
- QR code scanner via device camera
- Instant participant lookup on scan
- One-click meal redemption (with duplicate prevention)
- Search participants by name / email / phone
- Real-time meal status table
- Bulk CSV participant upload

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd hackathon-food-app
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key

### 3. Set Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Run the Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste and run the contents of `supabase_schema.sql`

This creates:
- `users` table with RLS policies
- `meal_status` table with RLS policies
- Auto-create trigger for `meal_status` on new user insert
- Realtime enabled on both tables

### 5. Configure Supabase Auth

In your Supabase dashboard:
1. Go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. Go to **Authentication → Settings**
4. Set **Site URL** to `http://localhost:5173` (dev) or your production URL
5. Add your production URL to **Redirect URLs**

> **Important:** The app uses `shouldCreateUser: false` in OTP — meaning users must be pre-added to the `users` table before they can log in. This is intentional for hackathon access control.

### 6. Add Your First Admin

Run this SQL in Supabase SQL Editor (replace with real values):

```sql
INSERT INTO public.users (id, name, email, phone, role, qr_code)
VALUES (
  gen_random_uuid(),
  'Your Name',
  'your@email.com',
  '9999999999',
  'admin',
  gen_random_uuid()::text
);
```

Then register this same email in Supabase Auth:
- Go to **Authentication → Users → Invite user**
- Enter the same email

### 7. Run Dev Server

```bash
npm run dev
```

Open `http://localhost:5173`

---

## 📦 Build for Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, Cloudflare Pages, etc.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── QRScanner.jsx        # Camera QR scanning (html5-qrcode)
│   ├── MealRedemptionPanel.jsx  # Meal redeem UI with status
│   └── BulkUpload.jsx       # CSV drag-and-drop uploader
├── hooks/
│   └── useAuth.jsx          # AuthContext + useAuth hook
├── lib/
│   └── supabase.js          # Supabase client + all DB helpers
├── pages/
│   ├── LoginPage.jsx        # Email OTP login (2-step)
│   ├── ParticipantDashboard.jsx  # Hacker view: QR + meal status
│   └── AdminDashboard.jsx   # Admin: scanner + table + upload
├── App.jsx                  # Router + protected routes
├── main.jsx
└── index.css                # Tailwind + custom design tokens
```

---

## 📋 CSV Upload Format

For bulk participant upload, use this CSV format:

```csv
name,email,phone,role
Alice Builder,alice@hack.dev,9876543210,participant
Bob Coder,bob@hack.dev,8765432109,participant
Carol Admin,carol@hack.dev,7654321098,admin
```

- `name` — required
- `email` — required, must be unique
- `phone` — optional
- `role` — optional, defaults to `participant`. Values: `participant` | `admin`

> After bulk upload, you must still invite these emails via **Supabase Auth → Users → Invite** (or use Supabase's admin API) so they can receive OTP codes.

---

## 🍽️ Meal Fields

| Field            | Label      | When      |
|------------------|------------|-----------|
| `lunch_day1`     | Lunch      | Day 1     |
| `dinner_day1`    | Dinner     | Day 1     |
| `breakfast_day2` | Breakfast  | Day 2     |
| `snacks`         | Snacks     | All Day   |

---

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Participants can only read their own data
- Admins can read/write all rows
- OTP-only auth — no passwords stored
- Duplicate redemption prevented at DB + UI layer

---

## 🛠️ Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + Vite |
| Styling  | Tailwind CSS |
| Auth     | Supabase Email OTP |
| Database | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime |
| QR Gen   | qrcode.react |
| QR Scan  | html5-qrcode |
| CSV      | PapaParse |
| Icons    | lucide-react |

---

## 🐛 Troubleshooting

**"No account found with this email"**
→ Make sure the user exists in `public.users` table AND is invited in Supabase Auth.

**Camera not working in scanner**
→ Must be served over HTTPS or localhost. Camera APIs don't work on plain HTTP.

**OTP not arriving**
→ Check Supabase Auth logs. Free tier has email rate limits.

**RLS blocking admin operations**
→ Ensure your user row has `role = 'admin'` in `public.users`.
