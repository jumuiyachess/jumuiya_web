-- ==============================================================================
-- PART 1: CORE DATABASE SCHEMA, TABLES, POLICIES & INDEXES
-- ==============================================================================
-- Run this first in Supabase SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. STORAGE BUCKET & POLICY
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'images');
    END IF;
END $$;

-- 3. CONTENT TABLES
-- Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    poster_url TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue TEXT NOT NULL,
    categories TEXT[] NOT NULL,
    entry_fee NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    max_participants INTEGER DEFAULT 100,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    terms_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tournaments' AND policyname = 'Allow public select for tournaments') THEN
        CREATE POLICY "Allow public select for tournaments" ON public.tournaments FOR SELECT USING (true);
    END IF;
END $$;

-- Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    featured_image_url TEXT,
    excerpt TEXT NOT NULL,
    body TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blog_posts' AND policyname = 'Allow public select for published blog posts') THEN
        CREATE POLICY "Allow public select for published blog posts" ON public.blog_posts FOR SELECT USING (published = true);
    END IF;
END $$;

-- Gallery Images
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_images' AND policyname = 'Allow public select for gallery images') THEN
        CREATE POLICY "Allow public select for gallery images" ON public.gallery_images FOR SELECT USING (true);
    END IF;
END $$;

-- Team Members
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    social_links JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'Allow public select for team members') THEN
        CREATE POLICY "Allow public select for team members" ON public.team_members FOR SELECT USING (true);
    END IF;
END $$;

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    price NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow public select for in-stock products') THEN
        CREATE POLICY "Allow public select for in-stock products" ON public.products FOR SELECT USING (in_stock = true);
    END IF;
END $$;

-- Partners
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'partners' AND policyname = 'Allow public select for partners') THEN
        CREATE POLICY "Allow public select for partners" ON public.partners FOR SELECT USING (true);
    END IF;
END $$;

-- Impact Programs
CREATE TABLE IF NOT EXISTS public.impact_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.impact_programs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'impact_programs' AND policyname = 'Allow public select for impact programs') THEN
        CREATE POLICY "Allow public select for impact programs" ON public.impact_programs FOR SELECT USING (true);
    END IF;
END $$;

-- Site Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    org_email TEXT NOT NULL,
    org_phone TEXT NOT NULL,
    mpesa_paybill TEXT NOT NULL,
    instagram_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    shop_enabled BOOLEAN NOT NULL DEFAULT true,
    our_story_title TEXT,
    our_story_heading TEXT,
    our_story_paragraph_1 TEXT,
    our_story_paragraph_2 TEXT,
    tournament_preset_categories TEXT[] DEFAULT ARRAY['Open', 'Under 18', 'Under 14', 'Under 10', 'Veterans', 'Ladies']::TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_settings' AND policyname = 'Allow public select for site settings') THEN
        CREATE POLICY "Allow public select for site settings" ON public.site_settings FOR SELECT USING (true);
    END IF;
END $$;

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    description TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'Public can view videos') THEN
        CREATE POLICY "Public can view videos" ON public.videos FOR SELECT USING (true);
    END IF;
END $$;

-- How It Started
CREATE TABLE IF NOT EXISTS public.how_it_started (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'How It Started',
    heading TEXT NOT NULL DEFAULT 'A Simple Idea That Ignited a Movement.',
    image_url TEXT,
    paragraphs JSONB NOT NULL DEFAULT '["Our journey began not in grand tournament halls, but in local communities where potential was abundant but opportunities were scarce. We saw first-hand how the discipline and strategy of chess could captivate young minds and teach them invaluable life skills.", "What started with just a handful of chess sets and a few dedicated volunteers quickly grew. As children learned to think ahead on the board, they began to envision brighter futures for themselves. Today, that simple idea has blossomed into a global initiative, transforming thousands of lives one move at a time."]'::jsonb,
    stats JSONB NOT NULL DEFAULT '[{"value": "20+", "label": "Communities"}, {"value": "10k+", "label": "Lives Touched"}]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.how_it_started ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'how_it_started' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON public.how_it_started FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'how_it_started' AND policyname = 'Enable insert for authenticated admin users only') THEN
        CREATE POLICY "Enable insert for authenticated admin users only" ON public.how_it_started FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'how_it_started' AND policyname = 'Enable update for authenticated admin users only') THEN
        CREATE POLICY "Enable update for authenticated admin users only" ON public.how_it_started FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Site Policies
CREATE TABLE IF NOT EXISTS public.site_policies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    lead_text TEXT,
    content TEXT,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.site_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_policies' AND policyname = 'Public can view site policies') THEN
        CREATE POLICY "Public can view site policies" ON public.site_policies FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'site_policies' AND policyname = 'Enable full access for authenticated users on site_policies') THEN
        CREATE POLICY "Enable full access for authenticated users on site_policies" ON public.site_policies FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- 4. TRANSACTIONAL TABLES
-- Registrations
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    age INTEGER NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    country TEXT DEFAULT 'Kenya',
    fide_id TEXT,
    school TEXT,
    category TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    accompanying_person TEXT,
    consent_given BOOLEAN DEFAULT false,
    amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    checkout_request_id TEXT,
    mpesa_receipt TEXT,
    ticket_number TEXT UNIQUE,
    attendance_status TEXT NOT NULL DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'checked-in')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'registrations' AND policyname = 'Enable insert for registrations') THEN
        CREATE POLICY "Enable insert for registrations" ON public.registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'registrations' AND policyname = 'Enable read access for authenticated users on registrations') THEN
        CREATE POLICY "Enable read access for authenticated users on registrations" ON public.registrations FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Shop Orders
CREATE TABLE IF NOT EXISTS public.shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    shipping_address TEXT,
    city TEXT,
    items JSONB NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    delivery_status TEXT DEFAULT 'pending',
    delivery_notes TEXT,
    checkout_request_id TEXT UNIQUE,
    mpesa_receipt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shop_orders' AND policyname = 'Enable insert for shop orders') THEN
        CREATE POLICY "Enable insert for shop orders" ON public.shop_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shop_orders' AND policyname = 'Enable read access for authenticated users on shop_orders') THEN
        CREATE POLICY "Enable read access for authenticated users on shop_orders" ON public.shop_orders FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Contact Messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Enable insert for contact_messages') THEN
        CREATE POLICY "Enable insert for contact_messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Enable read access for authenticated users on contact_messages') THEN
        CREATE POLICY "Enable read access for authenticated users on contact_messages" ON public.contact_messages FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Donations
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_name TEXT,
    email TEXT,
    phone_number TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    donor_message TEXT,
    payment_channel TEXT NOT NULL DEFAULT 'stk',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    checkout_request_id TEXT,
    mpesa_receipt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'Enable insert for anyone') THEN
        CREATE POLICY "Enable insert for anyone" ON public.donations FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'Enable read access for authenticated users only') THEN
        CREATE POLICY "Enable read access for authenticated users only" ON public.donations FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 5. INCREMENTAL COLUMN UPGRADES
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 100;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS terms_url TEXT;

ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS source_url TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'gallery_images' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.gallery_images ALTER COLUMN category DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_title TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_heading TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_paragraph_1 TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_paragraph_2 TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tournament_preset_categories TEXT[] DEFAULT ARRAY['Open', 'Under 18', 'Under 14', 'Under 10', 'Veterans', 'Ladies']::TEXT[];

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'registered';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Kenya';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS fide_id TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS accompanying_person TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.registrations
SET 
  first_name = split_part(player_name, ' ', 1),
  last_name = substring(player_name from length(split_part(player_name, ' ', 1)) + 2)
WHERE first_name IS NULL AND player_name IS NOT NULL;

ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts (published, published_at DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts (slug);

CREATE INDEX IF NOT EXISTS idx_tournaments_event_date ON public.tournaments (event_date ASC);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments (status);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments (slug);

CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id ON public.registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations (payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_number ON public.registrations (ticket_number);
CREATE INDEX IF NOT EXISTS idx_registrations_checkout_request_id ON public.registrations (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON public.shop_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_orders_payment_status ON public.shop_orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_checkout_request_id ON public.shop_orders (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON donations (payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_checkout_request_id ON donations (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at ON public.gallery_images (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_sort_order ON public.team_members (sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock) WHERE in_stock = true;
CREATE INDEX IF NOT EXISTS idx_impact_programs_sort_order ON public.impact_programs (sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos (created_at DESC);
