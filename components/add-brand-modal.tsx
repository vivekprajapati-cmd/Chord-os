'use client';

import { useState } from 'react';

const inputStyle = {
  width: '100%',
  background: 'var(--cream)',
  border: '1px solid var(--ink)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit',
} as const;

const labelStyle = {
  fontFamily: 'var(--f-mono)',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '6px',
};

export default function AddBrandModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [tier, setTier] = useState('tier-2');

  // Auto-generate slug from name
  function handleNameChange(val: string) {
    setName(val);
    setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  }

  async function save() {
    if (!name.trim()) { setError('Brand name is required.'); return; }
    if (!slug.trim()) { setError('Slug is required.'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/brands/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, category, tier }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.includes('unique') ? 'A brand with this slug already exists.' : data.error ?? 'Failed to create.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onAdded();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--ink)', overflow: 'hidden' }}>

        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '4px' }}>Brands</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '28px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Add Brand</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <label style={labelStyle}>Brand Name</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. IndiaGate" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Slug (auto-generated, editable)</label>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. indiagate" style={inputStyle} />
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '4px' }}>Used in URLs — lowercase, no spaces</p>
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. FMCG — Basmati Rice" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value)} style={inputStyle}>
              <option value="tier-1">Tier 1</option>
              <option value="tier-2">Tier 2</option>
              <option value="tier-3">Tier 3</option>
            </select>
          </div>

          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}

          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
            Colors, typography + voice can be added after via Edit brand.
          </p>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button
            onClick={save}
            disabled={loading}
            style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Adding…' : '+ Add brand'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 20px', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
