'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/demo/dashboard', label: 'Home',      icon: '⌂' },
  { href: '/demo/tasks',     label: 'Tasks',     icon: '✓' },
  { href: '/demo/calendar',  label: 'Calendar',  icon: '◫' },
  { href: '/demo/brands',    label: 'Brands',    icon: '◈' },
  { href: '/demo/chat',      label: 'Chat',      icon: '⌘' },
];

export default function DemoMobileNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      background: 'var(--cream)',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      alignItems: 'stretch',
      height: '60px',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV.map(({ href, label, icon }) => {
        const active = href === '/demo/dashboard' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              background: active ? 'var(--ink)' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: '16px', color: active ? 'var(--cream)' : 'var(--gray)', lineHeight: 1 }}>{icon}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? 'var(--cream)' : 'var(--gray)' }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
