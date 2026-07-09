'use client';

import { useEffect } from 'react';

export default function ClientPortalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
        Something went wrong
      </p>
      <p style={{ fontSize: '14px', color: 'var(--gray)', marginBottom: '24px', maxWidth: '320px' }}>
        We couldn't load this page. This is likely a temporary issue.
      </p>
      <button
        onClick={reset}
        style={{
          fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
          background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)',
          borderRadius: '999px', padding: '10px 20px', cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
