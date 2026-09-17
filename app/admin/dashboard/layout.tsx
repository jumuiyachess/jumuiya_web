'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { clearAuthTokenCache, warmupAdminData } from '@/lib/api';
import {
  LayoutDashboard,
  Trophy,
  Users,
  UserCheck,
  Image as ImageIcon,
  BookOpen,
  ShoppingBag,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Handshake,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Youtube,
  Target,
  HeartHandshake
} from 'lucide-react';

const MENU_GROUPS = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Event Registrations', href: '/admin/dashboard/registrations', icon: Users },
    ]
  },
  {
    title: 'Content & Media',
    items: [
      { name: 'Meet the Team', href: '/admin/dashboard/team', icon: UserCheck },
      { name: 'Media Gallery', href: '/admin/dashboard/gallery', icon: ImageIcon },
      { name: 'Blog & News', href: '/admin/dashboard/blog', icon: BookOpen },
      { name: 'Videos & Streams', href: '/admin/dashboard/videos', icon: Youtube },
      { name: 'How It Started', href: '/admin/dashboard/how-it-started', icon: BookOpen },
      { name: 'Terms & Policies', href: '/admin/dashboard/policies', icon: ShieldCheck },
    ]
  },
  {
    title: 'Management',
    items: [
      { name: 'Tournaments', href: '/admin/dashboard/tournaments', icon: Trophy },
      { name: 'Shop Inventory', href: '/admin/dashboard/shop', icon: ShoppingBag },
      { name: 'Shop Orders', href: '/admin/dashboard/shop/orders', icon: ShoppingBag },
      { name: 'Donations', href: '/admin/dashboard/donations', icon: HeartHandshake },
      { name: 'Impact Framework', href: '/admin/dashboard/impact', icon: Target },
      { name: 'Partners & Sponsors', href: '/admin/dashboard/partners', icon: Handshake },
      { name: 'Site Settings', href: '/admin/dashboard/settings', icon: SettingsIcon },
    ]
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Background Pre-fetching & Data Warmup for Instant 0ms Tab Switching
  useEffect(() => {
    warmupAdminData();
  }, []);

  const handleSignOut = async () => {
    clearAuthTokenCache();
    await supabase.auth.signOut();
    document.cookie = 'admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2A29] flex flex-col md:flex-row font-sans print:block print:min-h-0">
      {/* Mobile Top Bar */}
      <div className="md:hidden print:hidden sticky top-0 z-40 bg-white border-b border-stone-200 px-5 py-3.5 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6B4A34] text-[#F3ECE2] flex items-center justify-center font-bold font-serif text-sm">
            JC
          </div>
          <div>
            <span className="font-serif font-bold text-base text-charcoal tracking-tight block">
              Jumuiya Admin
            </span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-stone-600 hover:text-stone-900 rounded-lg bg-stone-100"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } md:block print:hidden bg-[#1E1C1B] text-[#F3ECE2] w-full md:w-64 shrink-0 border-r border-stone-800 flex flex-col justify-between p-5 transition-all duration-300 z-30 sticky top-0 h-screen overflow-y-auto`}
      >
        <div className="space-y-6">
          {/* Header Brand */}
          <div className="hidden md:flex items-center justify-between border-b border-stone-800 pb-5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#6B4A34] text-[#F3ECE2] border border-[#C8B195]/40 flex items-center justify-center font-bold font-serif shadow-md">
                JC
              </div>
              <div>
                <span className="font-serif text-lg font-bold tracking-tight text-white block">
                  Jumuiya <span className="text-[#EADBC8]">Admin</span>
                </span>
                <span className="text-[10px] text-[#C8B195] font-mono block font-semibold">Control Center</span>
              </div>
            </div>
          </div>

          {/* Quick Preview Link */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs text-[#EADBC8] font-semibold transition-all"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#C8B195]" />
              <span>Preview Website</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#C8B195] group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* Navigation Groups */}
          <nav className="space-y-5">
            {MENU_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-[#C8B195] px-3">
                  {group.title}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#6B4A34] text-[#F3ECE2] border-l-4 border-[#C8B195] shadow-md'
                            : 'text-white hover:bg-stone-800 hover:text-[#F3ECE2]'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#F3ECE2]' : 'text-[#C8B195]'}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="pt-5 border-t border-stone-800 space-y-3">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-stone-900 border border-stone-800">
            <div className="w-7 h-7 rounded-full bg-[#6B4A34] text-[#F3ECE2] border border-[#C8B195]/40 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                Admin Panel <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/40 border border-transparent transition-all w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (Light Mode) */}
      <main className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto print:overflow-visible print:h-auto print:p-0 bg-[#FAF7F2] print:bg-white">
        {children}
      </main>
    </div>
  );
}
