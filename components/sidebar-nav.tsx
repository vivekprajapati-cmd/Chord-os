'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, CalendarDays, Briefcase, Settings2, Mic2, Users, BarChart2, Brain, HeartHandshake } from 'lucide-react';

type Tier = 'admin' | 'lead' | 'operations' | 'poc' | 'staff';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', num: '01', Icon: LayoutDashboard },
  { href: '/tasks',      label: 'Tasks',      num: '02', Icon: CheckSquare },
  { href: '/calendar',   label: 'Calendar',   num: '03', Icon: CalendarDays },
  { href: '/brands',     label: 'Brands',     num: '04', Icon: Briefcase },
  { href: '/operations', label: 'Operations', num: '05', Icon: Settings2 },
];

export default function SidebarNav({ tier }: { tier: Tier }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function navLink(href: string, label: string, num: string, Icon: React.ElementType) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        style={{ textDecoration: 'none', background: active ? 'var(--coral)' : 'transparent', borderRadius: '8px', transition: 'background 0.15s' }}
        className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--ink)]/6"
      >
        <Icon size={14} style={{ color: active ? 'var(--paper)' : 'var(--ink)', opacity: active ? 0.9 : 0.6, flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: active ? 'var(--paper)' : 'var(--ink)',
        }}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map(({ href, label, num, Icon }) => navLink(href, label, num, Icon))}

      {tier === 'admin' && navLink('/chat', 'Allocator', '06', Mic2)}
      {tier === 'admin' && navLink('/team', 'Team', '07', Users)}
      {(tier === 'admin' || tier === 'poc') && navLink('/analytics', 'Analytics', '08', BarChart2)}
      {(tier === 'admin' || tier === 'lead' || tier === 'operations') && navLink('/harmony-core', 'Harmony Core', '09', Brain)}
      {/* HR tab hidden — under development */}
    </nav>
  );
}
