'use client';

import { useState } from 'react';
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

  function openAddClientFor(brandId?: string) {
    setPreselectedBrandId(brandId);
    setShowAddClient(true);
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

  const [loginsOpen, setLoginsOpen] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  function toggleExpanded(brandId: string) {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      next.has(brandId) ? next.delete(brandId) : next.add(brandId);
      return next;
    });
  }

  // group by brand_id
  const accountsByBrand: Record<string, ClientAccount[]> = {};
  clientAccounts.forEach(a => {
    if (!accountsByBrand[a.brand_id]) accountsByBrand[a.brand_id] = [];
    accountsByBrand[a.brand_id].push(a);
  });

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-5xl uppercase tracking-tight">Brands</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
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

      {/* Client logins panel — admin/ops only */}
      {isAdminOrOps && (
        <div style={{ border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden', background: 'var(--paper)' }}>
          {/* Outer accordion header */}
          <button
            onClick={() => setLoginsOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: loginsOpen ? '1px solid var(--line)' : 'none', textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                Client Logins
              </p>
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '3px 8px', borderRadius: '999px',
                background: 'rgba(13,13,11,0.06)', color: 'var(--gray)', border: '1px solid var(--line)',
              }}>
                {clientAccounts.filter(a => a.is_active).length} active
              </span>
            </div>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '14px', color: 'var(--gray)', display: 'inline-block', transform: loginsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
          </button>

          {loginsOpen && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {initialBrands.map(b => {
              const accounts = accountsByBrand[b.id] ?? [];
              return (
                <div
                  key={b.id}
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  {/* Clickable brand tab header */}
                  <button
                    onClick={() => toggleExpanded(b.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: expandedBrands.has(b.id) ? '1px solid var(--line)' : 'none',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {b.name}
                      </p>
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '3px 8px', borderRadius: '999px',
                        background: accounts.length > 0 ? 'rgba(26,122,69,0.1)' : 'rgba(13,13,11,0.06)',
                        color: accounts.length > 0 ? '#1a7a45' : 'var(--gray)',
                        border: accounts.length > 0 ? '1px solid rgba(26,122,69,0.2)' : '1px solid var(--line)',
                      }}>
                        {accounts.length === 0 ? 'No logins' : `${accounts.filter(a => a.is_active).length} active`}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '14px', color: 'var(--gray)', transform: expandedBrands.has(b.id) ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
                      ▾
                    </span>
                  </button>

                  {/* Expanded: account rows + add button */}
                  {expandedBrands.has(b.id) && (
                    <>
                      {accounts.length === 0 && (
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No logins yet for this brand.</p>
                        </div>
                      )}
                      {accounts.map((acc, i) => {
                        const isLast = i === accounts.length - 1;
                        const busy = togglingId === acc.id;
                        return (
                          <div
                            key={acc.id}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 20px',
                              borderBottom: isLast ? '1px solid var(--line)' : '1px solid var(--line)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em',
                                padding: '3px 8px', borderRadius: '999px',
                                background: acc.is_active ? 'rgba(26,122,69,0.1)' : 'rgba(13,13,11,0.06)',
                                color: acc.is_active ? '#1a7a45' : 'var(--gray)',
                                border: acc.is_active ? '1px solid rgba(26,122,69,0.2)' : '1px solid var(--line)',
                              }}>
                                {acc.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <p style={{ fontSize: '13px' }}>{acc.email}</p>
                            </div>
                            <button
                              onClick={() => toggleActive(acc.id, acc.is_active)}
                              disabled={busy}
                              style={{
                                fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em',
                                background: 'transparent',
                                color: acc.is_active ? 'var(--coral)' : 'var(--ink)',
                                border: `1px solid ${acc.is_active ? 'var(--coral)' : 'var(--ink)'}`,
                                borderRadius: '999px', padding: '5px 12px', cursor: busy ? 'not-allowed' : 'pointer',
                                opacity: busy ? 0.5 : 1,
                              }}
                            >
                              {busy ? '…' : acc.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        );
                      })}
                      {/* Add login row */}
                      <div style={{ padding: '12px 20px' }}>
                        <button
                          onClick={() => openAddClientFor(b.id)}
                          style={{
                            fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
                            background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)',
                            borderRadius: '999px', padding: '6px 14px', cursor: 'pointer',
                          }}
                        >
                          + Add Login
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

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
