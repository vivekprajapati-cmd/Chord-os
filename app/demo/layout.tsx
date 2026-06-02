import Link from 'next/link';
import DemoSidebarNav from './demo-sidebar-nav';
import DemoDrawer from './demo-drawer';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--cream)', fontFamily: 'var(--f-body)' }}
    >
      {/* Demo banner */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--yellow)',
        borderBottom: '1px solid var(--ink)',
        padding: '6px 16px',
        textAlign: 'center',
        fontFamily: 'var(--f-mono)',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--ink)',
      }}>
        Demo mode — static data, no DB connected
      </div>

      {/* Sidebar — desktop only */}
      <aside
        className="hidden md:flex flex-col shrink-0 h-screen overflow-y-auto"
        style={{
          width: '220px',
          borderRight: '1px solid var(--line)',
          background: 'var(--cream)',
          paddingTop: '32px',
        }}
      >
        <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid var(--line)' }}>
          <Link href="/demo/dashboard" className="group block">
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              ChordOS
            </span>
            <span style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginTop: '2px' }}>
              Ops workspace
            </span>
          </Link>
        </div>

        <DemoSidebarNav />

        <div className="px-5 py-5" style={{ borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--ink)', fontWeight: 500 }}>Darshit</p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Founders Office</p>
          <span style={{ display: 'inline-block', marginTop: '8px', fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '2px 8px', color: 'var(--ink)' }}>
            Lead
          </span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: '32px' }}>
        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-4 sticky top-8 z-30"
          style={{ background: 'var(--cream)', borderBottom: '1px solid var(--line)' }}>
          <DemoDrawer />
          <span style={{ fontFamily: 'var(--f-display)', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            ChordOS
          </span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>
            Darshit
          </span>
        </div>

        <div style={{ maxWidth: '960px', padding: 'clamp(20px, 4vw, 52px) clamp(16px, 4vw, 48px) 80px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
