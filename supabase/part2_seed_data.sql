-- ==============================================================================
-- PART 2: INITIAL SEED DATA
-- ==============================================================================
-- Run this second in Supabase SQL Editor (after Part 1 completes).
-- ==============================================================================

-- 1. Default Site Settings
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

-- 2. Default How It Started
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

-- 3. Default Videos
INSERT INTO public.videos (title, youtube_url, description, is_featured)
SELECT 'Dina Belenkaya Live at Charlotte Chess Centre', 'https://www.youtube.com/watch?v=-XLfXDGkcbE', 'Dina Belenkaya live with the Kenya National Team Champions during their one-month chess exchange workshop at Charlotte Chess Centre.', true
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_url = 'https://www.youtube.com/watch?v=-XLfXDGkcbE');

INSERT INTO public.videos (title, youtube_url, description, is_featured)
SELECT 'Empowering Youth Through Chess', 'https://www.youtube.com/watch?v=dHQGNQwtgyA', 'Bringing board games, structured learning, and mentorship across Kenya.', false
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_url = 'https://www.youtube.com/watch?v=dHQGNQwtgyA');

INSERT INTO public.videos (title, youtube_url, description, is_featured)
SELECT 'The Gift of Chess Mission', 'https://www.youtube.com/watch?v=9yAMCRHL0og', 'Distributing 1 million chess sets to unlock strategic thinking worldwide.', false
WHERE NOT EXISTS (SELECT 1 FROM public.videos WHERE youtube_url = 'https://www.youtube.com/watch?v=9yAMCRHL0og');

-- 4. Default Impact Programs
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

INSERT INTO impact_programs (title, description, image_url, sort_order)
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

-- 5. Default Legal & Policy Pages
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
