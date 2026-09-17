'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { SitePolicy, PolicySection } from '@/types';
import { 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Cookie, 
  Trophy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const POLICY_TABS = [
  { id: 'terms', label: 'Terms of Service', route: '/terms', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', route: '/privacy', icon: Lock },
  { id: 'cookies', label: 'Cookies Policy', route: '/cookies', icon: Cookie },
  { id: 'tournament-rules', label: 'Tournament Policy', route: '/tournaments/rules', icon: Trophy },
];

export default function AdminPoliciesPage() {
  const [activeTab, setActiveTab] = useState('terms');
  const [policies, setPolicies] = useState<Record<string, SitePolicy>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State for Active Policy
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [leadText, setLeadText] = useState('');
  const [sections, setSections] = useState<PolicySection[]>([]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<SitePolicy[]>('/policies');
      if (res.success && Array.isArray(res.data)) {
        const policyMap: Record<string, SitePolicy> = {};
        res.data.forEach(p => {
          policyMap[p.id] = p;
        });
        setPolicies(policyMap);

        const current = policyMap[activeTab];
        if (current) {
          setTitle(current.title || '');
          setSubtitle(current.subtitle || '');
          setLeadText(current.lead_text || '');
          setSections(current.sections || []);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load policies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  // When active tab changes, load its form state
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setFeedback(null);
    const policy = policies[tabId];
    if (policy) {
      setTitle(policy.title || '');
      setSubtitle(policy.subtitle || '');
      setLeadText(policy.lead_text || '');
      setSections(policy.sections ? [...policy.sections] : []);
    } else {
      setTitle('');
      setSubtitle('');
      setLeadText('');
      setSections([]);
    }
  };

  const handleAddSection = () => {
    const newSectionNumber = sections.length + 1;
    setSections(prev => [
      ...prev,
      {
        title: `${newSectionNumber}. New Section`,
        content: '',
      }
    ]);
  };

  const handleUpdateSection = (index: number, field: keyof PolicySection, value: string) => {
    setSections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        lead_text: leadText.trim(),
        sections,
      };

      const res = await apiRequest<SitePolicy>(`/policies/${activeTab}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setPolicies(prev => ({ ...prev, [activeTab]: res.data! }));
        setFeedback({ type: 'success', text: 'Policy changes saved successfully.' });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to update policy.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  const activeTabConfig = POLICY_TABS.find(t => t.id === activeTab) || POLICY_TABS[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#6B4A34] text-white p-6 md:p-8 rounded-2xl shadow-md border border-[#573b29] space-y-2">
        <div className="flex items-center space-x-2 text-[#EADBC8] text-xs font-mono font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Legal & Compliance Management</span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white">
          Terms & Policies
        </h1>
        <p className="text-xs md:text-sm text-[#FAF7F2]/90 font-sans max-w-3xl">
          Edit and manage site-wide terms, privacy policies, cookie usage, and tournament rules in real-time.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-[#6B4A34]/20 p-2 rounded-2xl shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {POLICY_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#6B4A34] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#232320] border border-stone-200 hover:bg-[#6B4A34]/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#6B4A34]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Content Area */}
      {loading ? (
        <div className="bg-white border border-[#6B4A34]/20 p-12 rounded-2xl shadow-xs flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B4A34]" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Top Bar for Selected Document */}
          <div className="bg-white border border-[#6B4A34]/20 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-base font-bold text-[#232320]">
                  Editing: {activeTabConfig.label}
                </span>
                {policies[activeTab]?.updated_at && (
                  <span className="text-[10px] text-stone-500 font-mono">
                    Last updated: {new Date(policies[activeTab].updated_at!).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-sans mt-0.5">
                Changes saved here reflect immediately on the public website.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <a
                href={activeTabConfig.route}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-stone-100 text-[#232320] border border-stone-200 text-xs font-bold transition-colors"
              >
                <span>Preview Page</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#6B4A34]" />
              </a>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-5 py-2 rounded-xl bg-[#6B4A34] hover:bg-[#573b29] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex items-center space-x-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* General Document Details Card */}
          <div className="bg-white border border-[#6B4A34]/20 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-serif text-sm font-bold text-[#232320] border-b border-stone-100 pb-2">
              Document Header Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Document Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Terms of Service"
                  className="w-full bg-[#FAF7F2] border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Platform Terms and Participation Agreement"
                  className="w-full bg-[#FAF7F2] border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Introductory Lead Paragraph</label>
              <textarea
                rows={3}
                value={leadText}
                onChange={(e) => setLeadText(e.target.value)}
                placeholder="Introductory text appearing beneath the main title..."
                className="w-full bg-[#FAF7F2] border border-stone-200 rounded-xl p-3 text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34] resize-y"
              />
            </div>
          </div>

          {/* Policy Sections Manager Card */}
          <div className="bg-white border border-[#6B4A34]/20 p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif text-sm font-bold text-[#232320]">
                  Policy Sections ({sections.length})
                </h3>
                <p className="text-[11px] text-stone-500 font-sans">
                  Each section represents a numbered article or clause in the policy.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSection}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#232320] hover:bg-[#6B4A34] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>

            {sections.length === 0 ? (
              <div className="p-8 text-center text-stone-400 bg-[#FAF7F2] rounded-xl border border-stone-200/60 text-xs">
                No sections defined. Click &quot;Add Section&quot; to create the first clause.
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#FAF7F2]/60 rounded-xl border border-stone-200/80 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#6B4A34] uppercase tracking-wider">
                        Section #{idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveSection(idx)}
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-600">Section Title</label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleUpdateSection(idx, 'title', e.target.value)}
                        placeholder="e.g. 1. Code of Conduct"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-600">Section Body Text</label>
                      <textarea
                        rows={4}
                        value={section.content}
                        onChange={(e) => handleUpdateSection(idx, 'content', e.target.value)}
                        placeholder="Detailed clause text..."
                        className="w-full bg-white border border-stone-200 rounded-lg p-3 text-xs text-[#232320] focus:outline-none focus:border-[#6B4A34] resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Add Section Button */}
            {sections.length > 0 && (
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-stone-200 bg-[#FAF7F2] hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#6B4A34]" />
                  <span>Add Another Section</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Save Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#6B4A34] hover:bg-[#573b29] text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Policy Changes</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
