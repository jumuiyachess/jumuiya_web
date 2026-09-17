import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 60;

const DEFAULT_TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: 'By registering for a tournament, purchasing items from our shop, or using our services, you confirm that you have read, understood, and agreed to be bound by these Terms of Service.'
  },
  {
    title: '2. Event Registration & Payments',
    content: 'All payments made via M-Pesa are final. Registration fees for tournaments are non-refundable unless the event is cancelled by the organizers. Paid entries guarantee a spot in the event only if completed before the registration deadline or before capacity is reached.'
  },
  {
    title: '3. Code of Conduct',
    content: 'Players and attendees are expected to conduct themselves with the highest degree of sportsmanship. We strictly enforce FIDE regulations during ranked events. Cheating, harassment, or disruptive behavior will result in immediate disqualification and removal from the venue without a refund.'
  },
  {
    title: '4. Limitation of Liability',
    content: 'Jumuiya Chess Initiative shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services or products.'
  },
  {
    title: '5. Governing Law',
    content: 'These Terms of Service are governed by the laws of Kenya. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Kenya.'
  }
];

export default async function TermsPage() {
  let policy: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('site_policies')
      .select('*')
      .eq('id', 'terms')
      .maybeSingle();
    policy = data;
  } catch (e) {
    // Graceful fallback to static defaults
  }

  const title = policy?.title || 'Terms of Service';
  const subtitle = policy?.subtitle || '';
  const leadText = policy?.lead_text || 'Welcome to the Jumuiya Chess Initiative. By accessing our platform and registering for events, you agree to these terms.';
  const sections = policy?.sections && Array.isArray(policy.sections) && policy.sections.length > 0
    ? policy.sections
    : DEFAULT_TERMS_SECTIONS;

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
