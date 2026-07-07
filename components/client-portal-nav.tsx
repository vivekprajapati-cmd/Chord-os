'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/client', label: 'Overview' },
  { href: '/client/brand-files', label: 'Brand Files' },
];

export default function ClientPortalNav() {
  const path = usePathname();

  return (
    <nav style={{
      width: '200px', flexShrink: 0, borderRight: '1px solid var(--line)',
      padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      {NAV.map(({ href, label }) => {
        const active = href === '/client' ? path === '/client' : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '9px 14px', borderRadius: '10px',
              textDecoration: 'none',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--cream)' : 'var(--gray)',
              transition: 'background 0.15s',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
