import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 60;

const DEFAULT_PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    content: 'We only collect information about you if we have a reason to do so. This typically includes personal details (name, email, phone number), transaction information processed securely via M-Pesa, and tournament data (FIDE IDs, ratings, and performance metrics).'
  },
  {
    title: '2. How We Use Information',
    content: 'We use the information we collect to process transactions and deliver store purchases, organize and communicate details about chess tournaments, improve our community offerings, and send administrative updates.'
  },
  {
    title: '3. Sharing Information',
    content: 'We do not sell our users personal information. We may share data with service providers (e.g. Safaricom M-Pesa), chess federations (FIDE / Chess Kenya for rating purposes), or as required by law.'
  },
  {
    title: '4. Media Release',
    content: 'By attending a Jumuiya Chess event, you grant us the right to take photographs and video recordings for promotional and documentation purposes on our website and social media channels.'
  },
  {
    title: '5. Your Rights',
    content: 'You have the right to request access to the personal data we hold about you, or request its deletion. Contact us if you have any questions.'
  }
];

export default async function PrivacyPolicyPage() {
  let policy: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('site_policies')
      .select('*')
      .eq('id', 'privacy')
      .maybeSingle();
    policy = data;
  } catch (e) {
    // Graceful fallback to static defaults
  }

  const title = policy?.title || 'Privacy Policy';
  const subtitle = policy?.subtitle || '';
  const leadText = policy?.lead_text || 'Your privacy is critically important to us. This Privacy Policy explains what information we collect, why we collect it, and how we protect your personal data at the Jumuiya Chess Initiative.';
  const sections = policy?.sections && Array.isArray(policy.sections) && policy.sections.length > 0
    ? policy.sections
    : DEFAULT_PRIVACY_SECTIONS;

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
