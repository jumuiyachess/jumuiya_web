-- ==============================================================================
-- JUMUIYA CHESS - ALL-IN-ONE CONSOLIDATED DATABASE MIGRATION SCRIPT
-- ==============================================================================
-- This script safely combines all tables, extensions, storage buckets, 
-- Row Level Security (RLS) policies, performance indexes, and initial seeds.
--
-- SAFE & IDEMPOTENT:
-- Every table enables RLS immediately upon creation.
-- Policies and indexes are checked with IF NOT EXISTS so it can be re-run safely.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. STORAGE BUCKET & STORAGE POLICIES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. CONTENT TABLES (WITH IMMEDIATE RLS & POLICIES)
-- ------------------------------------------------------------------------------

-- 1. Tournaments
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

-- 2. Blog Posts
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

-- 3. Gallery Images
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

-- 4. Team Members
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

-- 5. Products (Store)
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

-- 6. Partners
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

-- 7. Impact Programs
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

-- 8. Site Settings (Singleton)
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

-- 9. Videos
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

-- 10. How It Started
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

-- 11. Site Policies (Terms, Privacy, Cookies, Tournament Rules)
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

-- ------------------------------------------------------------------------------
-- 4. TRANSACTIONAL TABLES (WITH IMMEDIATE RLS & POLICIES)
-- ------------------------------------------------------------------------------

-- 12. Registrations
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

-- 13. Shop Orders
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

-- 14. Contact Messages
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

-- 15. Donations
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

-- ------------------------------------------------------------------------------
-- 5. INCREMENTAL COLUMN UPGRADES FOR EXISTING DATABASES
-- ------------------------------------------------------------------------------
-- tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 100;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS terms_url TEXT;

-- blog_posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS source_url TEXT;

-- gallery_images (remove NOT NULL constraint on category if it exists from legacy schemas)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'gallery_images' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.gallery_images ALTER COLUMN category DROP NOT NULL;
    END IF;
END $$;

-- team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_title TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_heading TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_paragraph_1 TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS our_story_paragraph_2 TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS tournament_preset_categories TEXT[] DEFAULT ARRAY['Open', 'Under 18', 'Under 14', 'Under 10', 'Veterans', 'Ladies']::TEXT[];

-- registrations
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

-- Backfill first_name and last_name for existing records if null
UPDATE public.registrations
SET 
  first_name = split_part(player_name, ' ', 1),
  last_name = substring(player_name from length(split_part(player_name, ' ', 1)) + 2)
WHERE first_name IS NULL AND player_name IS NOT NULL;

-- shop_orders
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- ------------------------------------------------------------------------------
-- 6. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
-- blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts (published, published_at DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts (slug);

-- tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_event_date ON public.tournaments (event_date ASC);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments (status);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments (slug);

-- registrations
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_id ON public.registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations (payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_number ON public.registrations (ticket_number);
CREATE INDEX IF NOT EXISTS idx_registrations_checkout_request_id ON public.registrations (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

-- shop_orders
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON public.shop_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_orders_payment_status ON public.shop_orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_checkout_request_id ON public.shop_orders (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON donations (payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_checkout_request_id ON donations (checkout_request_id) WHERE checkout_request_id IS NOT NULL;

-- gallery_images
CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at ON public.gallery_images (created_at DESC);

-- team_members
CREATE INDEX IF NOT EXISTS idx_team_members_sort_order ON public.team_members (sort_order ASC, created_at ASC);

-- products
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock) WHERE in_stock = true;

-- impact_programs
CREATE INDEX IF NOT EXISTS idx_impact_programs_sort_order ON public.impact_programs (sort_order ASC, created_at ASC);

-- videos
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos (created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. ESSENTIAL SEED DATA (IDEMPOTENT)
-- ------------------------------------------------------------------------------

-- Default Site Settings
INSERT INTO public.site_settings (
    id, 
    org_email, 
    org_phone, 
    mpesa_paybill, 
    shop_enabled,
    our_story_title,
    our_story_heading,
    our_story_paragraph_1,
    our_story_paragraph_2,
    tournament_preset_categories
)
VALUES (
    1, 
    'info@jumuiyachess.org', 
    '+254722274720', 
    '174379', 
    true,
    'Our Story',
    'Elevating Strategy from the Board to the Community.',
    'The Gift of Chess is a nonprofit organization dedicated to using chess as a tool for education, personal development, and social transformation. Since our inception, we have worked with schools, children''s homes, prisons, and refugee communities across Kenya to nurture talent, build critical thinking, and provide safe, constructive spaces where children and youth can grow and thrive.',
    'In Kenya, we have also integrated an environmental sustainability component into our work. In partnership with Kijiji Solutions, we recycle plastic waste to produce chess sets, turning waste into meaningful tools that expand access to chess while contributing to climate action.',
    ARRAY['Open', 'Under 18', 'Under 14', 'Under 10', 'Veterans', 'Ladies']::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

-- Default How It Started
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.how_it_started) THEN
    INSERT INTO public.how_it_started (title, heading, image_url, paragraphs, stats)
    VALUES (
      'How It Started',
      'A Simple Idea That Ignited a Movement.',
      '/images/kids3.jpg',
      '["Our journey began not in grand tournament halls, but in local communities where potential was abundant but opportunities were scarce. We saw first-hand how the discipline and strategy of chess could captivate young minds and teach them invaluable life skills.", "What started with just a handful of chess sets and a few dedicated volunteers quickly grew. As children learned to think ahead on the board, they began to envision brighter futures for themselves. Today, that simple idea has blossomed into a global initiative, transforming thousands of lives one move at a time."]'::jsonb,
      '[{"value": "20+", "label": "Communities"}, {"value": "10k+", "label": "Lives Touched"}]'::jsonb
    );
  END IF;
END $$;

-- Default Videos
INSERT INTO public.videos (title, youtube_url, description, is_featured)
SELECT 'Dina Belenkaya Live at Charlotte Chess Centre', 'https://www.youtube.com/watch?v=-XLfXDGkcbE', 'Dina Belenkaya live with the Kenya National Team Champions during their one-month chess exchange workshop at Charlotte Chess Centre.', true
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_url = 'https://www.youtube.com/watch?v=-XLfXDGkcbE');

INSERT INTO public.videos (title, youtube_url, description, is_featured)
SELECT 'Empowering Youth Through Chess', 'https://www.youtube.com/watch?v=dHQGNQwtgyA', 'Bringing board games, structured learning, and mentorship across Kenya.', false
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_url = 'https://www.youtube.com/watch?v=dHQGNQwtgyA');

INSERT INTO public.videos (title, youtube_url, description, is_featured)
SELECT 'The Gift of Chess Mission', 'https://www.youtube.com/watch?v=9yAMCRHL0og', 'Distributing 1 million chess sets to unlock strategic thinking worldwide.', false
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_url = 'https://www.youtube.com/watch?v=9yAMCRHL0og');

-- Default Impact Programs
INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Public Schools Chess Development', 'Over the past three years, we have distributed chess sets to several public schools and actively supported the chess club at Mwiki Primary School in Githurai. While the overall chess program is thriving, there is a noticeable gap in public primary schools chess participation. Our goal is to continue strengthening chess in public schools.', '/images/pawn.png', 1
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Public Schools Chess Development');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Chess for Informal Settlements', 'We have extended our chess programs into informal settlements, where access to structured extracurricular activities is often limited. Through the distribution of chess sets and partnerships with community based clubs (including Kibera Knights and Agape chess club), we are creating safe spaces for children and youth to learn, interact, and grow through chess. These initiatives aim to promote positive engagement and provide an alternative pathway away from negative social influences.', '/images/knight.png', 2
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Chess for Informal Settlements');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Juvenile Rehabilitation & Freedom', 'We engage juveniles in correctional facilities through structured chess training and mentorship. Through the Chess for Freedom initiative, we have distributed chess sets to prisons across Kenya and participated for the past three years in the Online Chess for Freedom World Tournament.', '/images/rookie.png', 3
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Juvenile Rehabilitation & Freedom');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Kakuma Refugee Camp Collaboration', 'We have partnered with FIDE and UNHCR under the Chess for Protection initiative in Kakuma Refugee Camp. Our work includes structured chess sessions, community engagement, and participation in mentorship activities, including those during International Chess Day.', '/images/bishop.png', 4
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Kakuma Refugee Camp Collaboration');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Infinite Chess for Autism', 'Launched in January 2025 at Autism School International in Thika, this specialized program supports children on the autism spectrum. It uses chess as a therapeutic and developmental tool, helping improve focus, communication, and cognitive skills. We are seeking committed partners to help expand this initiative.', '/images/queen.png', 5
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Infinite Chess for Autism');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Children''s Homes Development', 'We have established and continue to support chess programs in children''s homes across Kenya, including Familia Moja, Muthiga Hope, Happy Life, Ruiru, and Mully Children''s Family. These programs focus on consistent training, mentorship, and exposure through tournaments.', '/images/king.png', 6
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Children''s Homes Development');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Her MoveNext Kenyan Chapter', 'Dedicated to empowering girls and young women through chess education, leadership workshops, and targeted tournament exposure. This initiative builds confidence, critical thinking, and equal opportunities for girls and children across Kenya.', '/images/queen.png', 7
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Her MoveNext Kenyan Chapter');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Chess Tournaments & Exposure', 'We organize chess tournaments that attract top players from across East Africa. These events provide valuable exposure for young players from our programs, allowing them to interact with experienced players, improve their skills, and build confidence.', '/images/Elite Pieces Focal.png', 8
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Chess Tournaments & Exposure');

INSERT INTO public.impact_programs (title, description, image_url, sort_order)
SELECT 'Kenya Elite Chess Players Exchange Programme', 'Connecting Kenya''s top chess prodigies with international grandmasters and elite academies across the globe. Through structured player exchanges, high-level training camps, and international competition, we elevate Kenyan talent onto the world stage.', '/images/king.png', 9
WHERE NOT EXISTS (SELECT 1 FROM public.impact_programs WHERE title = 'Kenya Elite Chess Players Exchange Programme');

-- Default Legal & Policy Pages
INSERT INTO public.site_policies (id, title, subtitle, lead_text, sections)
VALUES
(
  'terms',
  'Terms of Service',
  'Platform Terms and Participation Agreement',
  'Welcome to the Jumuiya Chess Initiative. By accessing our platform and registering for events, you agree to these terms.',
  '[
    {"title": "1. Acceptance of Terms", "content": "By registering for a tournament, purchasing items from our shop, or using our services, you confirm that you have read, understood, and agreed to be bound by these Terms of Service."},
    {"title": "2. Event Registration & Payments", "content": "All payments made via M-Pesa are final. Registration fees for tournaments are non-refundable unless the event is cancelled by the organizers. Paid entries guarantee a spot in the event only if completed before the registration deadline or before capacity is reached."},
    {"title": "3. Code of Conduct", "content": "Players and attendees are expected to conduct themselves with the highest degree of sportsmanship. We strictly enforce FIDE regulations during ranked events. Cheating, harassment, or disruptive behavior will result in immediate disqualification and removal from the venue without a refund."},
    {"title": "4. Limitation of Liability", "content": "Jumuiya Chess Initiative shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services or products."},
    {"title": "5. Governing Law", "content": "These Terms of Service are governed by the laws of Kenya. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Kenya."}
  ]'::jsonb
),
(
  'privacy',
  'Privacy Policy',
  'Data Collection & User Rights',
  'Your privacy is critically important to us. This Privacy Policy explains what information we collect, why we collect it, and how we protect your personal data at the Jumuiya Chess Initiative.',
  '[
    {"title": "1. Information We Collect", "content": "We only collect information about you if we have a reason to do so. This typically includes personal details (name, email, phone number), transaction information processed securely via M-Pesa, and tournament data (FIDE IDs, ratings, and performance metrics)."},
    {"title": "2. How We Use Information", "content": "We use the information we collect to process transactions and deliver store purchases, organize and communicate details about chess tournaments, improve our community offerings, and send administrative updates."},
    {"title": "3. Sharing Information", "content": "We do not sell our users personal information. We may share data with service providers (e.g. Safaricom M-Pesa), chess federations (FIDE / Chess Kenya for rating purposes), or as required by law."},
    {"title": "4. Media Release", "content": "By attending a Jumuiya Chess event, you grant us the right to take photographs and video recordings for promotional and documentation purposes on our website and social media channels."},
    {"title": "5. Your Rights", "content": "You have the right to request access to the personal data we hold about you, or request its deletion. Contact us if you have any questions."}
  ]'::jsonb
),
(
  'cookies',
  'Cookies Policy',
  'Cookie Usage & Preferences',
  'This Cookies Policy explains how Jumuiya Chess uses cookies and similar technologies to recognize you when you visit our website.',
  '[
    {"title": "1. What are Cookies?", "content": "Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information."},
    {"title": "2. Why Do We Use Cookies?", "content": "We use first-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate, and we refer to these as essential or strictly necessary cookies. Other cookies enable us to enhance the experience on our website."},
    {"title": "3. Types of Cookies We Use", "content": "Strictly Necessary Cookies: essential to provide you with services available through our website (e.g. secure checkout and account sessions). Functionality Cookies: remember choices you make, such as your cookie consent preferences. Analytics Cookies: collect information to help us understand how the website is used."},
    {"title": "4. How Can I Control Cookies?", "content": "You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in the cookie consent banner when you first visit the site, or amend your web browser controls."},
    {"title": "5. Updates to this Policy", "content": "We may update this Cookies Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this page regularly to stay informed."}
  ]'::jsonb
),
(
  'tournament-rules',
  'Tournament Policy',
  'Official Rules & Regulations',
  'Official rules and regulations governing all Jumuiya Chess Initiative events, adhering to FIDE and Chess Kenya standards.',
  '[
    {"title": "1. FIDE & Chess Kenya Rules", "content": "By registering, players agree to adhere strictly to official tournament rules, pairing criteria, and sportsmanship regulations governed by FIDE and Chess Kenya. All arbiters decisions are final during rated matches."},
    {"title": "2. Electronic Devices & Fair Play", "content": "Electronic devices, including mobile phones and smartwatches, must be completely powered off in the playing hall. Any unsportsmanlike conduct or cheating will result in immediate disqualification and removal without a fee refund."},
    {"title": "3. Entry Fee & Refunds", "content": "Entry fees are processed securely via M-Pesa. Registration fees are non-refundable once pairings are published (usually 24 hours prior to the event), unless the tournament is cancelled by organizers. PWD/DAP entries are free."},
    {"title": "4. Arrival & Check-In", "content": "Players are required to present their official Digital PDF Ticket or printed equivalent at the registration desk at least 30 minutes before round 1 begins. Late arrivals may forfeit the first round."}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
