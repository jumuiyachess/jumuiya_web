-- ==============================================================================
-- JUMUIYA CHESS - BASE DATABASE SCHEMA
-- ==============================================================================
-- Run this script or 'supabase/combined_migrations.sql' in the Supabase SQL Editor.
-- ==============================================================================

-- Enable UUID extension if not active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. STORAGE BUCKET
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'images');

-- ------------------------------------------------------------------------------
-- 2. CONTENT TABLES
-- ------------------------------------------------------------------------------

-- tournaments
CREATE TABLE IF NOT EXISTS tournaments (
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

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for tournaments" ON tournaments;
CREATE POLICY "Allow public select for tournaments" 
    ON tournaments FOR SELECT 
    USING (true);

-- blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
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

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for published blog posts" ON blog_posts;
CREATE POLICY "Allow public select for published blog posts" 
    ON blog_posts FOR SELECT 
    USING (published = true);

-- gallery_images
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for gallery images" ON gallery_images;
CREATE POLICY "Allow public select for gallery images" 
    ON gallery_images FOR SELECT 
    USING (true);

-- team_members
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    social_links JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for team members" ON team_members;
CREATE POLICY "Allow public select for team members"
    ON team_members FOR SELECT
    USING (true);

-- products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    price NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for in-stock products" ON products;
CREATE POLICY "Allow public select for in-stock products" 
    ON products FOR SELECT 
    USING (in_stock = true);

-- partners
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for partners" ON partners;
CREATE POLICY "Allow public select for partners" 
    ON partners FOR SELECT 
    USING (true);

-- impact_programs
CREATE TABLE IF NOT EXISTS impact_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE impact_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for impact programs" ON impact_programs;
CREATE POLICY "Allow public select for impact programs"
    ON impact_programs FOR SELECT
    USING (true);

-- site_settings
CREATE TABLE IF NOT EXISTS site_settings (
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

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select for site settings" ON site_settings;
CREATE POLICY "Allow public select for site settings" 
    ON site_settings FOR SELECT 
    USING (true);

-- videos
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    description TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view videos" ON videos;
CREATE POLICY "Public can view videos" 
    ON videos FOR SELECT 
    USING (true);

-- how_it_started
CREATE TABLE IF NOT EXISTS how_it_started (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'How It Started',
    heading TEXT NOT NULL DEFAULT 'A Simple Idea That Ignited a Movement.',
    image_url TEXT,
    paragraphs JSONB NOT NULL DEFAULT '["Our journey began not in grand tournament halls, but in local communities where potential was abundant but opportunities were scarce. We saw first-hand how the discipline and strategy of chess could captivate young minds and teach them invaluable life skills.", "What started with just a handful of chess sets and a few dedicated volunteers quickly grew. As children learned to think ahead on the board, they began to envision brighter futures for themselves. Today, that simple idea has blossomed into a global initiative, transforming thousands of lives one move at a time."]'::jsonb,
    stats JSONB NOT NULL DEFAULT '[{"value": "20+", "label": "Communities"}, {"value": "10k+", "label": "Lives Touched"}]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE how_it_started ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON how_it_started;
CREATE POLICY "Enable read access for all users" ON how_it_started FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated admin users only" ON how_it_started;
CREATE POLICY "Enable insert for authenticated admin users only" ON how_it_started FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated admin users only" ON how_it_started;
CREATE POLICY "Enable update for authenticated admin users only" ON how_it_started FOR UPDATE USING (auth.role() = 'authenticated');

-- site_policies
CREATE TABLE IF NOT EXISTS site_policies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    lead_text TEXT,
    content TEXT,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE site_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view site policies" ON site_policies;
CREATE POLICY "Public can view site policies" ON site_policies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable full access for authenticated users on site_policies" ON site_policies;
CREATE POLICY "Enable full access for authenticated users on site_policies" ON site_policies FOR ALL TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. TRANSACTIONAL TABLES
-- ------------------------------------------------------------------------------

-- registrations
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
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

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for registrations" ON registrations;
CREATE POLICY "Enable insert for registrations" ON registrations FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users on registrations" ON registrations;
CREATE POLICY "Enable read access for authenticated users on registrations" ON registrations FOR SELECT TO authenticated USING (true);

-- shop_orders
CREATE TABLE IF NOT EXISTS shop_orders (
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

ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for shop orders" ON shop_orders;
CREATE POLICY "Enable insert for shop orders" ON shop_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users on shop_orders" ON shop_orders;
CREATE POLICY "Enable read access for authenticated users on shop_orders" ON shop_orders FOR SELECT TO authenticated USING (true);

-- contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for contact_messages" ON contact_messages;
CREATE POLICY "Enable insert for contact_messages" ON contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users on contact_messages" ON contact_messages;
CREATE POLICY "Enable read access for authenticated users on contact_messages" ON contact_messages FOR SELECT TO authenticated USING (true);

-- donations
CREATE TABLE IF NOT EXISTS donations (
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

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for anyone" ON donations;
CREATE POLICY "Enable insert for anyone" ON donations FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON donations;
CREATE POLICY "Enable read access for authenticated users only" ON donations FOR SELECT TO authenticated USING (true);
