import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 60;

const DEFAULT_TOURNAMENT_RULES = [
  {
    title: '1. FIDE & Chess Kenya Rules',
    content: "By registering, players agree to adhere strictly to official tournament rules, pairing criteria, and sportsmanship regulations governed by FIDE and Chess Kenya. All arbiters' decisions are final during rated matches."
  },
  {
    title: '2. Electronic Devices & Fair Play',
    content: 'Electronic devices, including mobile phones and smartwatches, must be completely powered off in the playing hall. Any unsportsmanlike conduct or cheating will result in immediate disqualification and removal without a fee refund.'
  },
  {
    title: '3. Entry Fee & Refunds',
    content: 'Entry fees are processed securely via M-Pesa. Registration fees are non-refundable once pairings are published (usually 24 hours prior to the event), unless the tournament is cancelled by organizers. PWD/DAP entries are free.'
  },
  {
    title: '4. Arrival & Check-In',
    content: 'Players are required to present their official Digital PDF Ticket or printed equivalent at the registration desk at least 30 minutes before round 1 begins. Late arrivals may forfeit the first round.'
  }
];

export default async function TournamentRulesPage() {
  let policy: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('site_policies')
      .select('*')
      .eq('id', 'tournament-rules')
      .maybeSingle();
    policy = data;
  } catch (e) {
    // Fallback to static defaults
  }

  const title = policy?.title || 'Tournament Policy';
  const subtitle = policy?.subtitle || 'OFFICIAL RULES & REGULATIONS';
  const leadText = policy?.lead_text || 'Official rules and regulations governing all Jumuiya Chess Initiative events, adhering to FIDE and Chess Kenya standards.';
  const sections = policy?.sections && Array.isArray(policy.sections) && policy.sections.length > 0
    ? policy.sections
    : DEFAULT_TOURNAMENT_RULES;

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center space-x-2 text-[#6B4A34] hover:underline font-bold font-sans text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-[#6B4A34]/10">
          <div className="flex items-start space-x-4 mb-6">
            <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#6B4A34]/20 text-[#6B4A34] shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#232320]">{title}</h1>
              {subtitle && (
                <p className="font-mono text-xs text-[#6B4A34] font-semibold uppercase tracking-wider">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="prose prose-stone max-w-none font-sans text-[#232320]/80">
            {leadText && (
              <p className="lead text-lg mb-8 text-stone-700 leading-relaxed">{leadText}</p>
            )}
            
            <div className="space-y-6">
              {sections.map((section: any, idx: number) => (
                <div key={idx} className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#6B4A34]/20">
                  <h3 className="flex items-center space-x-2 font-serif text-xl font-bold text-[#6B4A34] mb-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{section.title}</span>
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
