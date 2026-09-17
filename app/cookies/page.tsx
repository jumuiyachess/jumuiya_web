import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 60;

const DEFAULT_COOKIES_SECTIONS = [
  {
    title: '1. What are Cookies?',
    content: 'Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information.'
  },
  {
    title: '2. Why Do We Use Cookies?',
    content: 'We use first-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate, and we refer to these as essential or strictly necessary cookies. Other cookies enable us to enhance the experience on our website.'
  },
  {
    title: '3. Types of Cookies We Use',
    content: 'Strictly Necessary Cookies: essential to provide you with services available through our website (e.g. secure checkout and account sessions). Functionality Cookies: remember choices you make, such as your cookie consent preferences. Analytics Cookies: collect information to help us understand how the website is used.'
  },
  {
    title: '4. How Can I Control Cookies?',
    content: 'You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in the cookie consent banner when you first visit the site, or amend your web browser controls.'
  },
  {
    title: '5. Updates to this Policy',
    content: 'We may update this Cookies Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this page regularly to stay informed.'
  }
];

export default async function CookiesPolicyPage() {
  let policy: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('site_policies')
      .select('*')
      .eq('id', 'cookies')
      .maybeSingle();
    policy = data;
  } catch (e) {
    // Graceful fallback to static defaults
  }

  const title = policy?.title || 'Cookies Policy';
  const subtitle = policy?.subtitle || '';
  const leadText = policy?.lead_text || 'This Cookies Policy explains how Jumuiya Chess uses cookies and similar technologies to recognize you when you visit our website.';
  const sections = policy?.sections && Array.isArray(policy.sections) && policy.sections.length > 0
    ? policy.sections
    : DEFAULT_COOKIES_SECTIONS;

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center space-x-2 text-[#6B4A34] hover:underline font-bold font-sans text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-[#6B4A34]/10">
          <div className="space-y-2 mb-8">
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#232320]">{title}</h1>
            {subtitle && (
              <p className="font-mono text-xs text-[#6B4A34] font-semibold uppercase tracking-wider">{subtitle}</p>
            )}
          </div>
          
          <div className="prose prose-stone max-w-none font-sans text-[#232320]/80 space-y-6">
            {leadText && (
              <p className="lead text-lg text-stone-700 leading-relaxed">{leadText}</p>
            )}
            
            {sections.map((section: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <h2 className="font-serif text-xl md:text-2xl font-bold text-[#6B4A34] pt-4">
                  {section.title}
                </h2>
                <p className="text-stone-700 leading-relaxed whitespace-pre-line text-sm md:text-base">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
