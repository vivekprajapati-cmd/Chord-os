'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddBrandModal from '@/components/add-brand-modal';

type Brand = { id: string; slug: string; name: string; category: string; tier: string; status: string };

export default function BrandsClient({ brands: initialBrands, isLead }: { brands: Brand[]; isLead: boolean }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <div>
        <div className="flex items-end justify-between mb-6">
          <h1 className="font-display text-5xl uppercase tracking-tight">Brands</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialBrands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.slug}`}
              className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)] hover:shadow-[8px_8px_0_var(--ink)] transition"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-display text-3xl uppercase tracking-tight">{b.name}</h2>
                <span className="text-xs font-mono uppercase border border-[var(--ink)] rounded-full px-2 py-0.5">
                  {b.tier}
                </span>
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
    </>
  );
}
