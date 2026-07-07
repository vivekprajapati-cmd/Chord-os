'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddBrandModal from '@/components/add-brand-modal';
import AddClientLoginModal from '@/components/add-client-login-modal';

type Brand = { id: string; slug: string; name: string; category: string; tier: string; status: string };

export default function BrandsClient({
  brands: initialBrands,
  isLead,
  isAdminOrOps,
}: {
  brands: Brand[];
  isLead: boolean;
  isAdminOrOps: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  return (
    <>
      <div>
        <div className="flex items-end justify-between mb-6">
          <h1 className="font-display text-5xl uppercase tracking-tight">Brands</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            {isAdminOrOps && (
              <button
                onClick={() => setShowAddClient(true)}
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1px solid var(--ink)',
                  borderRadius: '999px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                }}
              >
                + Client Login
              </button>
            )}
            {isLead && (
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  border: '1px solid var(--ink)',
                  borderRadius: '999px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0 var(--ink)',
                }}
              >
                + Add Brand
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialBrands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.slug}`}
              className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)] hover:shadow-[8px_8px_0_var(--ink)] transition"
            >
              <div className="mb-3">
                <h2 className="font-display text-3xl uppercase tracking-tight">{b.name}</h2>
              </div>
              <p className="text-sm text-[var(--gray)]">{b.category}</p>
            </Link>
          ))}
        </div>
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
          onClose={() => setShowAddClient(false)}
          onAdded={() => setShowAddClient(false)}
        />
      )}
    </>
  );
}
