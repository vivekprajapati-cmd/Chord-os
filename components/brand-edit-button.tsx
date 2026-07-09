'use client';

import { useState } from 'react';
import EditBrandModal from './edit-brand-modal';

type Brand = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tier: string;
  voice_summary: string | null;
  colors: Record<string, string>;
  typography: Record<string, string>;
  ops_tracker_sheet_id?: string | null;
};

export default function BrandEditButton({ brand }: { brand: Brand }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowEdit(true)}
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: 'transparent',
          color: 'var(--ink)',
          border: '1px solid var(--ink)',
          borderRadius: '999px',
          padding: '8px 18px',
          cursor: 'pointer',
        }}
      >
        Edit brand
      </button>

      {showEdit && (
        <EditBrandModal
          brand={brand}
          onClose={() => setShowEdit(false)}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  );
}
