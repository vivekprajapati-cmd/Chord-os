'use client';

import { useState } from 'react';

type ColorEntry = { name: string; hex: string };
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

export default function EditBrandModal({ brand, onClose, onSaved }: {
  brand: Brand;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [category, setCategory] = useState(brand.category ?? '');
  const [tier, setTier] = useState(brand.tier ?? 'tier-2');
  const [voice, setVoice] = useState(brand.voice_summary ?? '');

  // Colors — convert object to array for editing
  const [colors, setColors] = useState<ColorEntry[]>(
    Object.entries(brand.colors ?? {}).map(([name, hex]) => ({ name, hex })).length > 0
      ? Object.entries(brand.colors ?? {}).map(([name, hex]) => ({ name, hex }))
      : [{ name: 'primary', hex: '#000000' }]
  );

  // Typography — display, body, labels, weights
  const [typoDisplay, setTypoDisplay] = useState(brand.typography?.display ?? '');
  const [typoBody, setTypoBody] = useState(brand.typography?.body ?? '');
  const [typoLabels, setTypoLabels] = useState(brand.typography?.labels ?? '');
  const [sheetUrl, setSheetUrl] = useState(brand.ops_tracker_sheet_id ?? '');

  function addColor() {
    setColors(c => [...c, { name: '', hex: '#000000' }]);
  }

  function removeColor(i: number) {
    setColors(c => c.filter((_, j) => j !== i));
  }

  async function save() {
    setLoading(true);
    setError('');

    const colorsObj = colors.reduce<Record<string, string>>((acc, c) => {
      if (c.name.trim()) acc[c.name.trim()] = c.hex;
      return acc;
    }, {});

    const typographyObj: Record<string, string> = {};
    if (typoDisplay.trim()) typographyObj.display = typoDisplay.trim();
    if (typoBody.trim()) typographyObj.body = typoBody.trim();
    if (typoLabels.trim()) typographyObj.labels = typoLabels.trim();

    // Extract sheet ID from full URL or use as-is if already just an ID
    const sheetInput = sheetUrl.trim();
    const sheetMatch = sheetInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetMatch ? sheetMatch[1] : (sheetInput || null);

    const res = await fetch('/api/brands/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: brand.id,
        category: category.trim(),
        tier,
        voice_summary: voice.trim() || null,
        colors: colorsObj,
        typography: typographyObj,
        ops_tracker_sheet_id: sheetId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to save.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '580px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--coral)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '4px' }}>Brand</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '28px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{brand.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

          {/* Category + Tier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
          </div>

          {/* Brand Colors */}
          <div>
            <label style={labelStyle}>Brand Colors</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colors.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={c.name}
                    onChange={e => setColors(cs => cs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    placeholder="Name (e.g. primary)"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="color"
                    value={c.hex}
                    onChange={e => setColors(cs => cs.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))}
                    style={{ width: '48px', height: '42px', padding: '2px', border: '1px solid var(--ink)', borderRadius: '8px', cursor: 'pointer', background: 'var(--cream)' }}
                  />
                  <input
                    value={c.hex}
                    onChange={e => setColors(cs => cs.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))}
                    placeholder="#000000"
                    style={{ ...inputStyle, width: '110px', flexShrink: 0 }}
                  />
                  {colors.length > 1 && (
                    <button onClick={() => removeColor(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addColor}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--cobalt)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
              >
                + Add color
              </button>
            </div>
          </div>

          {/* Typography */}
          <div>
            <label style={labelStyle}>Typography</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Display font', value: typoDisplay, set: setTypoDisplay, placeholder: 'e.g. Playfair Display' },
                { label: 'Body font', value: typoBody, set: setTypoBody, placeholder: 'e.g. Lato' },
                { label: 'Labels font', value: typoLabels, set: setTypoLabels, placeholder: 'e.g. Montserrat' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', width: '80px', flexShrink: 0 }}>{label}</span>
                  <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, flex: 1 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Tone & Voice */}
          <div>
            <label style={labelStyle}>Tone & Voice</label>
            <textarea
              rows={4}
              value={voice}
              onChange={e => setVoice(e.target.value)}
              placeholder="Describe the brand voice — tone, what to avoid, key phrases, feeling."
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }}
            />
          </div>

          {/* Ops Tracker Sheet */}
          <div>
            <label style={labelStyle}>Ops Tracker Sheet URL</label>
            <input
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="Paste Google Sheets URL or sheet ID"
              style={inputStyle}
            />
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '5px' }}>
              Used to sync client dashboard — paste the full URL, the ID will be extracted automatically.
            </p>
          </div>

          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button
            onClick={save}
            disabled={loading}
            style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Saving…' : 'Save brand'}
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
