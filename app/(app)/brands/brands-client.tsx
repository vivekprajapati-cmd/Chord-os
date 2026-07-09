'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AddBrandModal from '@/components/add-brand-modal';
import AddClientLoginModal from '@/components/add-client-login-modal';

type Brand = { id: string; slug: string; name: string; category: string; tier: string; status: string };
type ClientAccount = { id: string; email: string; is_active: boolean; brand_id: string };

export default function BrandsClient({
  brands: initialBrands,
  isLead,
  isAdminOrOps,
  clientAccounts: initialClientAccounts,
}: {
  brands: Brand[];
  isLead: boolean;
  isAdminOrOps: boolean;
  clientAccounts: ClientAccount[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [preselectedBrandId, setPreselectedBrandId] = useState<string | undefined>();
  const [clientAccounts, setClientAccounts] = useState(initialClientAccounts);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loginsOpen, setLoginsOpen] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!loginsOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setLoginsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [loginsOpen]);

  function openAddClientFor(brandId?: string) {
    setPreselectedBrandId(brandId);
    setShowAddClient(true);
  }

  function toggleBrand(brandId: string) {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      next.has(brandId) ? next.delete(brandId) : next.add(brandId);
      return next;
    });
  }

  async function deleteAccount(id: string) {
    if (!confirm('Delete this client login permanently? This cannot be undone.')) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/client-accounts/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) {
      setClientAccounts(prev => prev.filter(a => a.id !== id));
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id);
    const res = await fetch(`/api/admin/client-accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setTogglingId(null);
    if (res.ok) {
      setClientAccounts(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
    }
  }

  const accountsByBrand: Record<string, ClientAccount[]> = {};
  clientAccounts.forEach(a => {
    if (!accountsByBrand[a.brand_id]) accountsByBrand[a.brand_id] = [];
    accountsByBrand[a.brand_id].push(a);
  });

  const activeCount = clientAccounts.filter(a => a.is_active).length;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-5xl uppercase tracking-tight">Brands</h1>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }} ref={panelRef}>
          {/* Client Logins button + dropdown */}
          {isAdminOrOps && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLoginsOpen(o => !o)}
                style={{
                  fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: loginsOpen ? 'var(--ink)' : 'transparent',
                  color: loginsOpen ? 'var(--cream)' : 'var(--ink)',
                  border: '1px solid var(--ink)', borderRadius: '999px',
                  padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                Client Logins
                {activeCount > 0 && (
                  <span style={{
                    background: loginsOpen ? 'var(--cream)' : 'var(--ink)',
                    color: loginsOpen ? 'var(--ink)' : 'var(--cream)',
                    borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontWeight: 700,
                  }}>
                    {activeCount}
                  </span>
                )}
              </button>

              {/* Dropdown panel */}
              {loginsOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 40,
                  width: '420px', background: 'var(--cream)',
                  border: '1.5px solid var(--ink)', borderRadius: '16px',
                  boxShadow: '6px 6px 0 var(--ink)', overflow: 'hidden',
                }}>
                  {/* Panel header */}
                  <div style={{
                    padding: '14px 18px', borderBottom: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                      Client Logins
                    </p>
                    <button
                      onClick={() => { openAddClientFor(undefined); setLoginsOpen(false); }}
                      style={{
                        fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)',
                        borderRadius: '999px', padding: '5px 12px', cursor: 'pointer',
                      }}
                    >
                      + Add Login
                    </button>
                  </div>

                  {/* Brands list */}
                  <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    {initialBrands.map((b, i) => {
                      const accounts = accountsByBrand[b.id] ?? [];
                      const isExpanded = expandedBrands.has(b.id);
                      const isLast = i === initialBrands.length - 1;
                      return (
                        <div key={b.id} style={{ borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--line)' }}>
                          {/* Brand row */}
                          <button
                            onClick={() => toggleBrand(b.id)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
                              borderBottom: isExpanded ? '1px solid var(--line)' : 'none', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {b.name}
                              </p>
                              <span style={{
                                fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase',
                                padding: '2px 7px', borderRadius: '999px',
                                background: accounts.length > 0 ? 'rgba(26,122,69,0.1)' : 'rgba(13,13,11,0.06)',
                                color: accounts.length > 0 ? '#1a7a45' : 'var(--gray)',
                                border: accounts.length > 0 ? '1px solid rgba(26,122,69,0.2)' : '1px solid var(--line)',
                              }}>
                                {accounts.length === 0 ? 'none' : `${accounts.filter(a => a.is_active).length} active`}
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--gray)', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                          </button>

                          {/* Expanded accounts */}
                          {isExpanded && (
                            <div style={{ background: 'rgba(13,13,11,0.02)' }}>
                              {accounts.length === 0 ? (
                                <div style={{ padding: '10px 18px 10px 28px' }}>
                                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>No logins yet.</p>
                                </div>
                              ) : accounts.map((acc) => {
                                const busy = togglingId === acc.id;
                                return (
                                  <div key={acc.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '9px 18px 9px 28px', borderBottom: '1px solid var(--line)',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase',
                                        padding: '2px 6px', borderRadius: '999px',
                                        background: acc.is_active ? 'rgba(26,122,69,0.1)' : 'rgba(13,13,11,0.06)',
                                        color: acc.is_active ? '#1a7a45' : 'var(--gray)',
                                        border: acc.is_active ? '1px solid rgba(26,122,69,0.2)' : '1px solid var(--line)',
                                      }}>
                                        {acc.is_active ? 'Active' : 'Off'}
                                      </span>
                                      <p style={{ fontSize: '12px' }}>{acc.email}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <button
                                        onClick={() => toggleActive(acc.id, acc.is_active)}
                                        disabled={busy}
                                        style={{
                                          fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase',
                                          background: 'transparent',
                                          color: acc.is_active ? 'var(--coral)' : 'var(--ink)',
                                          border: `1px solid ${acc.is_active ? 'var(--coral)' : 'var(--ink)'}`,
                                          borderRadius: '999px', padding: '4px 10px', cursor: busy ? 'not-allowed' : 'pointer',
                                          opacity: busy ? 0.5 : 1,
                                        }}
                                      >
                                        {busy ? '…' : acc.is_active ? 'Deactivate' : 'Reactivate'}
                                      </button>
                                      <button
                                        onClick={() => deleteAccount(acc.id)}
                                        disabled={deletingId === acc.id}
                                        title="Delete login"
                                        style={{
                                          background: 'transparent', border: '1px solid var(--line)',
                                          borderRadius: '999px', padding: '4px 8px', cursor: deletingId === acc.id ? 'not-allowed' : 'pointer',
                                          color: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          opacity: deletingId === acc.id ? 0.4 : 1,
                                        }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                          <path d="M10 11v6M14 11v6" />
                                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Add login for this brand */}
                              <div style={{ padding: '10px 18px 10px 28px' }}>
                                <button
                                  onClick={() => { openAddClientFor(b.id); setLoginsOpen(false); }}
                                  style={{
                                    fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.06em',
                                    background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)',
                                    borderRadius: '999px', padding: '4px 10px', cursor: 'pointer',
                                  }}
                                >
                                  + Add Login
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAdminOrOps && (
            <button
              onClick={() => openAddClientFor(undefined)}
              style={{
                fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)',
                borderRadius: '999px', padding: '10px 20px', cursor: 'pointer',
              }}
            >
              + Client Login
            </button>
          )}

          {isLead && (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)',
                borderRadius: '999px', padding: '10px 20px', cursor: 'pointer',
                boxShadow: '3px 3px 0 var(--ink)',
              }}
            >
              + Add Brand
            </button>
          )}
        </div>
      </div>

      {/* Brand grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialBrands.map((b) => (
          <Link
            key={b.id}
            href={`/brands/${b.slug}`}
            className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)] hover:shadow-[8px_8px_0_var(--ink)] transition"
          >
            <h2 className="font-display text-3xl uppercase tracking-tight mb-1">{b.name}</h2>
            <p className="text-sm text-[var(--gray)]">{b.category}</p>
          </Link>
        ))}
      </div>

      {showAdd && (
        <AddBrandModal
          onClose={() => setShowAdd(false)}
          onAdded={() => window.location.reload()}
        />
      )}

      {showAddClient && (
        <AddClientLoginModal
          brands={initialBrands}
          preselectedBrandId={preselectedBrandId}
          onClose={() => setShowAddClient(false)}
          onAdded={(newAccount) => {
            if (newAccount) setClientAccounts(prev => [...prev, newAccount]);
            setShowAddClient(false);
          }}
        />
      )}
    </>
  );
}
