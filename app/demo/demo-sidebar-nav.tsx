'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/demo/dashboard', label: 'Dashboard', num: '01' },
  { href: '/demo/briefings', label: 'Briefings',  num: '02' },
  { href: '/demo/tasks',     label: 'Tasks',      num: '03' },
  { href: '/demo/calendar',  label: 'Calendar',   num: '04' },
  { href: '/demo/brands',    label: 'Brands',     num: '05' },
  { href: '/demo/chat',      label: 'Allocator',  num: '06' },
  { href: '/demo/team',      label: 'Team',       num: '07' },
  { href: '/demo/analytics', label: 'Analytics',  num: '08' },
];

export default function DemoSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map(({ href, label, num }) => {
        const active = pathname === href || (href !== '/demo/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            style={{ textDecoration: 'none' }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${active ? 'bg-[var(--ink)]' : 'hover:bg-[var(--ink)]/6'}`}
          >
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', opacity: active ? 0.5 : 0.3, width: '16px', flexShrink: 0, color: active ? 'var(--cream)' : 'var(--ink)' }}>
              {num}
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? 'var(--cream)' : 'var(--ink)' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
