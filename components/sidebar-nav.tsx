'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tier = 'admin' | 'poc' | 'staff';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', num: '01' },
  { href: '/briefings',  label: 'Briefings',  num: '02' },
  { href: '/tasks',      label: 'Tasks',       num: '03' },
  { href: '/calendar',   label: 'Calendar',    num: '04' },
  { href: '/brands',     label: 'Brands',      num: '05' },
];

export default function SidebarNav({ tier }: { tier: Tier }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function navLink(href: string, label: string, num: string) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        style={{ textDecoration: 'none' }}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
          active ? 'bg-[var(--ink)]' : 'hover:bg-[var(--ink)]/6'
        }`}
      >
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '9px',
          opacity: active ? 0.5 : 0.3,
          width: '16px',
          flexShrink: 0,
          color: active ? 'var(--cream)' : 'var(--ink)',
        }}>
          {num}
        </span>
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: active ? 'var(--cream)' : 'var(--ink)',
        }}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map(({ href, label, num }) => navLink(href, label, num))}

      {/* Leads only */}
      {tier === 'admin' && navLink('/chat', 'Allocator', '07')}
      {tier === 'admin' && navLink('/team', 'Team', '08')}
      {tier === 'admin' && navLink('/analytics', 'Analytics', '09')}
    </nav>
  );
}
