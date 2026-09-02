'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HRTabs() {
  const pathname = usePathname();

  const tabs = [
    { href: '/hr/feedback', label: 'Feedback' },
    { href: '/hr/leaves',   label: 'Leaves'   },
  ];

  return (
    <div style={{ display: 'flex', borderBottom: '1.5px solid var(--line)', marginBottom: '24px' }}>
      {tabs.map(t => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '10px 18px', textDecoration: 'none',
              borderBottom: active ? '2px solid var(--coral)' : '2px solid transparent',
              marginBottom: '-1.5px',
              color: active ? 'var(--ink)' : 'var(--gray)',
              fontWeight: active ? 700 : 500,
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
