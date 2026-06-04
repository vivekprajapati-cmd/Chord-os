import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SidebarNav from '@/components/sidebar-nav';
import MobileDrawer from '@/components/mobile-drawer';
import SidebarUser from '@/components/sidebar-user';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: person } = await supabase
    .from('people')
    .select('id, name, role, department, seniority, location, is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (person?.is_team_lead ? 'admin' : 'staff') as 'admin' | 'poc' | 'staff';
  const firstName = person?.name?.split(' ')[0] ?? user.email?.split('@')[0] ?? '';

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--cream)', fontFamily: 'var(--f-body)' }}
    >
      {/* ── Sidebar — desktop only ── */}
      <aside
        className="hidden md:flex flex-col shrink-0 h-screen overflow-y-auto"
        style={{
          width: '220px',
          borderRight: '1px solid var(--line)',
          background: 'var(--cream)',
        }}
      >
        {/* Logo */}
        <div className="px-4 pt-8 pb-6" style={{ borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
          <Link href="/dashboard" className="group block">
            {/* Chord logo */}
            <img
              src="/chord-logo.png"
              alt="Chord"
              style={{ height: '80px', width: 'auto', display: 'block', margin: '0 auto', mixBlendMode: 'multiply' }}
            />
            <span style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginTop: '8px' }}>
              Ops workspace
            </span>
          </Link>
        </div>

        <SidebarNav tier={tier} />

        <SidebarUser
          person={{
            id: person?.id ?? '',
            name: person?.name ?? firstName,
            email: user.email ?? '',
            role: person?.role ?? '',
            department: person?.department ?? '',
            seniority: (person as any)?.seniority ?? 'Mid',
            location: (person as any)?.location ?? 'Mumbai',
          }}
          tier={tier}
        />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-4 sticky top-0 z-30"
          style={{ background: 'var(--cream)', borderBottom: '1px solid var(--line)' }}>
          <MobileDrawer tier={tier} firstName={firstName} role={person?.role ?? person?.department ?? ''} />
          <span style={{ fontFamily: 'var(--f-display)', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            Harmony
          </span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>
            {firstName}
          </span>
        </div>

        <div style={{ maxWidth: '960px', padding: 'clamp(20px, 4vw, 52px) clamp(16px, 4vw, 48px) 80px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
