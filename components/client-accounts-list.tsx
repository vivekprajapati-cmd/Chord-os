'use client';

import { useState } from 'react';

type ClientAccount = { id: string; email: string; is_active: boolean };

export default function ClientAccountsList({ brandId, initialAccounts }: { brandId: string; initialAccounts: ClientAccount[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (accounts.length === 0) {
    return (
      <div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
          Client Logins
        </p>
        <p style={{ fontSize: '13px', color: 'var(--gray)' }}>No client logins created for this brand yet.</p>
      </div>
    );
  }

  async function toggleActive(id: string, current: boolean) {
    setLoading(id);
    setError('');
    const res = await fetch(`/api/admin/client-accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to update.');
      return;
    }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
        Client Logins
      </p>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
        {accounts.map((acc, i) => {
          const isLast = i === accounts.length - 1;
          const isBusy = loading === acc.id;
          return (
            <div
              key={acc.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '3px 8px', borderRadius: '999px',
                  background: acc.is_active ? 'rgba(26,122,69,0.1)' : 'rgba(13,13,11,0.06)',
                  color: acc.is_active ? '#1a7a45' : 'var(--gray)',
                  border: acc.is_active ? '1px solid rgba(26,122,69,0.2)' : '1px solid var(--line)',
                }}>
                  {acc.is_active ? 'Active' : 'Inactive'}
                </span>
                <p style={{ fontSize: '13px', fontWeight: 500 }}>{acc.email}</p>
              </div>

              <button
                onClick={() => toggleActive(acc.id, acc.is_active)}
                disabled={isBusy}
                style={{
                  fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '7px 14px', borderRadius: '999px', cursor: isBusy ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  color: acc.is_active ? 'var(--coral)' : 'var(--ink)',
                  border: `1px solid ${acc.is_active ? 'var(--coral)' : 'var(--ink)'}`,
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                {isBusy ? '…' : acc.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}
