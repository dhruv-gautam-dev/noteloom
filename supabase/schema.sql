-- ============================================================================
-- NoteLoom V2 - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Phase 1: Authentication, Profiles, Cloud Notes & Analytics Telemetry
-- ============================================================================

-- Enable required Postgres extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Profiles Table (Tied 1:1 with Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'pro', 'admin')),
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'admin')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to automatically create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. Notes Table (Multi-tenant Cloud Vault)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    video_id TEXT NOT NULL,
    video_title TEXT NOT NULL,
    channel TEXT,
    sequence_index INT DEFAULT 1,
    topic TEXT,
    markdown_content TEXT NOT NULL,
    is_educational BOOLEAN DEFAULT true,
    is_fallback BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_video_id ON public.notes(video_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_user_video ON public.notes(user_id, video_id);

-- Row Level Security (RLS) for Notes:
-- Users can only see, create, edit, or delete their own notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notes"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Analytics & Platform Telemetry Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);

-- Row Level Security (RLS) for Analytics Events:
-- Anyone (guests + logged-in users) can log telemetry events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log analytics events"
    ON public.analytics_events FOR INSERT
    WITH CHECK (true);

-- Only admins / service role can view analytics
CREATE POLICY "Admins can view analytics"
    ON public.analytics_events FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.tier = 'admin'
        )
    );

