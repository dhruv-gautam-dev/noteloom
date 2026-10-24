# 🚀 Supabase Cloud & Authentication Setup Guide

NoteLoom V2 uses Supabase for multi-tenant data isolation, cloud vault persistence, and authentication.

---

## 1. Create Your Free Supabase Project

1. Go to [supabase.com](https://supabase.com) and click **Sign Up** or **Sign In**.
2. Click **New Project** and select your organization.
3. Enter project details:
   - **Name:** `NoteLoom` (or any name you prefer)
   - **Database Password:** Set a strong password (save it safely)
   - **Region:** Choose the region closest to you (e.g. `ap-south-1` for Mumbai / India)
   - **Pricing Plan:** Free ($0/month)
4. Click **Create new project** and wait ~1-2 minutes for provisioning to complete.

---

## 2. Execute the Database Schema & RLS Policies

1. In your Supabase Project dashboard, click on the **SQL Editor** icon in the left sidebar (or press `Ctrl + K` and type `SQL`).
2. Click **New Query**.
3. Open [`supabase/schema.sql`](../supabase/schema.sql) from this repository, copy all contents, and paste them into the SQL editor.
4. Click **Run** (or `Ctrl + Enter`).
5. You should see `Success. No rows returned`.

### What This Created:
- `public.profiles`: Stores user profiles and automatically links 1:1 with `auth.users` via a Postgres trigger.
- `public.notes`: Multi-tenant cloud vault table with strict **Row Level Security (RLS)** — users can only view, edit, or delete their own notes.
- `public.analytics_events`: Telemetry table allowing guests and authenticated users to log feature usage.

---

## 3. Retrieve Your Supabase API Keys

1. In the Supabase dashboard, click on **Project Settings** (gear icon at the bottom-left).
2. Go to **API** under Configuration.
3. Copy the following values into your `.env` (in the project root) or `frontend/.env`:

```env
# Supabase Cloud Settings
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-api-settings
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend Variables
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. (Optional) Enable Google & GitHub OAuth

### To enable Google OAuth:
1. Go to **Authentication** -> **Providers** in your Supabase dashboard.
2. Select **Google** and switch the toggle to **Enabled**.
3. Follow the instructions to create OAuth credentials in Google Cloud Console.
4. Add the Supabase Redirect URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to your authorized redirect URIs.

### To enable GitHub OAuth:
1. In Supabase, go to **Authentication** -> **Providers** -> **GitHub**.
2. Create an OAuth app in GitHub Developer Settings (`https://github.com/settings/developers`).
3. Set Authorization callback URL to `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Paste the Client ID and Client Secret into Supabase and save.

---

## 5. Verification

1. Start NoteLoom backend (`python -m uvicorn backend.app.main:app --reload`) and frontend (`npm run dev`).
2. Click the **Sign In** button in the top-right of NoteLoom's header.
3. Enter an email and password to create an account or sign in with Google/GitHub.
4. Once signed in, your user pill will appear in the header with your avatar and email!

