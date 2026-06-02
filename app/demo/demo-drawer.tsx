'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/demo/dashboard', label: 'Dashboard', num: '01' },
  { href: '/demo/briefings', label: 'Briefings',  num: '02' },
  { href: '/demo/tasks',     label: 'Tasks',     num: '03' },
  { href: '/demo/calendar',  label: 'Calendar',  num: '04' },
  { href: '/demo/brands',    label: 'Brands',    num: '05' },
  { href: '/demo/chat',      label: 'Allocator', num: '06' },
  { href: '/demo/team',      label: 'Team',      num: '07' },
  { href: '/demo/analytics', label: 'Analytics', num: '08' },
];

export default function DemoDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/demo/dashboard') return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}
        aria-label="Open menu"
      >
        <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--ink)', borderRadius: '2px' }} />
        <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--ink)', borderRadius: '2px' }} />
        <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--ink)', borderRadius: '2px' }} />
      </button>

      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        width: '280px', background: 'var(--cream)',
        borderRight: '1.5px solid var(--ink)',
        boxShadow: open ? '8px 0 0 var(--ink)' : 'none',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '22px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)' }}>ChordOS</span>
            <span style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginTop: '2px' }}>Demo mode</span>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--gray)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px' }}>
          {NAV.map(({ href, label, num }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', textDecoration: 'none', background: active ? 'var(--ink)' : 'transparent', marginBottom: '2px', transition: 'background 0.15s' }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', opacity: active ? 0.5 : 0.3, color: active ? 'var(--cream)' : 'var(--ink)', width: '18px', flexShrink: 0 }}>{num}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? 'var(--cream)' : 'var(--ink)' }}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--ink)', fontWeight: 500 }}>Darshit</p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Founders Office</p>
          <span style={{ display: 'inline-block', marginTop: '8px', fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '2px 8px', color: 'var(--ink)' }}>Lead</span>
        </div>
      </div>
    </>
  );
}
