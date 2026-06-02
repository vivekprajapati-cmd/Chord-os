'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tier = 'admin' | 'poc' | 'staff';

const BASE_NAV = [
  { href: '/dashboard', label: 'Home',     icon: '⌂' },
  { href: '/tasks',     label: 'Tasks',    icon: '✓' },
  { href: '/calendar',  label: 'Calendar', icon: '◫' },
  { href: '/brands',    label: 'Brands',   icon: '◈' },
];

const LEAD_NAV = [
  { href: '/chat',      label: 'Chat',     icon: '⌘' },
];

export default function MobileNav({ tier }: { tier: Tier }) {
  const pathname = usePathname();
  const nav = [...BASE_NAV, ...(tier === 'admin' ? LEAD_NAV : [])];

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
      {nav.map(({ href, label, icon }) => {
        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
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
