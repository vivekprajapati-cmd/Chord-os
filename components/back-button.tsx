'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--f-mono)',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        color: 'var(--gray)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        marginBottom: '20px',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray)')}
    >
      ← Back
    </button>
  );
}
