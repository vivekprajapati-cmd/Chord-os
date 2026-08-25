'use client';

import { useState } from 'react';

type Props = {
  assignments: any[];
  entries: any[];
  month: string;
  personId: string;
  canEdit: boolean;
  onSaved: () => void;
};

const LINK_FIELDS = [
  { key: 'trend_link', label: 'Trend Created' },
  { key: 'moment_marketing_link', label: 'Moment/Topical' },
  { key: 'reel_10k_link', label: 'Reel Organic 10k' },
  { key: 'high_vtr_link', label: 'High VTR Reel (50%+)' },
  { key: 'high_engagement_link', label: 'High Organic Engagement' },
  { key: 'brand_appreciated_link', label: 'Brand Appreciated' },
];

function BrandAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#e0f2fe', '#fce7f3', '#f0fdf4', '#fef9c3', '#ede9fe', '#ffedd5'];
  const textColors = ['#0369a1', '#9d174d', '#15803d', '#a16207', '#6d28d9', '#c2410c'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: textColors[idx], flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function CreativeTable({ assignments, entries, month, personId, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function getEntry(brandId: string) {
    return entries.find(e => e.brand_id === brandId);
  }

  function startEdit(brandId: string) {
    const m = getEntry(brandId)?.metrics ?? {};
    setDrafts(prev => ({
      ...prev,
      [brandId]: {
        nps: m.nps ?? '',
        new_idea: m.new_idea ?? '',
        trend_link: m.trend_link ?? '',
        moment_marketing_link: m.moment_marketing_link ?? '',
        reel_10k_link: m.reel_10k_link ?? '',
        high_vtr_link: m.high_vtr_link ?? '',
        high_engagement_link: m.high_engagement_link ?? '',
        brand_appreciated_link: m.brand_appreciated_link ?? '',
      }
    }));
    setEditing(brandId);
  }

  function setField(brandId: string, field: string, value: any) {
    setDrafts(prev => ({ ...prev, [brandId]: { ...prev[brandId], [field]: value } }));
  }

  async function save(brandId: string) {
    const d = drafts[brandId];
    setSaving(brandId);
    await fetch('/api/harmony-core', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_id: personId,
        brand_id: brandId,
        month,
        role_type: 'creative',
        metrics: { ...d, nps: Number(d.nps) || 0 },
        tracker_logs: { orm: [], ops: [], social: [] },
      }),
    });
    setSaving(null);
    setEditing(null);
    onSaved();
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #c8c4bc', borderRadius: '12px', boxShadow: '4px 4px 0 var(--ink, #0D0D0B)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
        <thead>
          <tr>
            <th style={{ ...thLeft, background: '#dedad2' }}>Brand</th>
            <th style={{ ...th, background: '#dedad2' }}>NPS</th>
            <th style={{ ...th, background: '#c8e6c9', color: '#2e7d32' }}>New Idea This Week</th>
            {LINK_FIELDS.map(f => <th key={f.key} style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>{f.label}</th>)}
            <th style={{ ...th, background: '#dedad2', width: '48px' }}></th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a: any) => {
            const brandId = a.brand_id;
            const brandName = a.brands?.name ?? brandId;
            const entry = getEntry(brandId);
            const m = entry?.metrics ?? {};
            const isEditing = editing === brandId;
            const d = drafts[brandId] ?? {};

            return (
              <tr key={brandId}>
                <td style={{ ...tdLeft, minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BrandAvatar name={brandName} />
                    <span style={{ fontWeight: 500 }}>{brandName}</span>
                  </div>
                </td>

                {isEditing ? (
                  <>
                    <td style={td}>
                      <input type="number" value={d.nps} onChange={e => setField(brandId, 'nps', e.target.value)}
                        style={inputStyle} />
                    </td>
                    <td style={td}>
                      <input type="text" value={d.new_idea} onChange={e => setField(brandId, 'new_idea', e.target.value)}
                        placeholder="Write idea..."
                        style={{ ...inputStyle, width: '140px' }} />
                    </td>
                    {LINK_FIELDS.map(f => (
                      <td key={f.key} style={td}>
                        <input type="url" value={d[f.key]} onChange={e => setField(brandId, f.key, e.target.value)}
                          placeholder="Paste link..."
                          style={{ ...inputStyle, width: '110px' }} />
                      </td>
                    ))}
                  </>
                ) : (
                  <>
                    <td style={td}><Num v={m.nps} /></td>
                    <td style={{ ...td, maxWidth: '160px' }}>
                      {m.new_idea
                        ? <span style={{ fontSize: '12px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.new_idea}</span>
                        : <Muted />}
                    </td>
                    {LINK_FIELDS.map(f => (
                      <td key={f.key} style={td}>
                        {m[f.key]
                          ? <a href={m[f.key]} target="_blank" rel="noreferrer" style={{ color: 'var(--text-accent)', fontSize: '12px', textDecoration: 'none' }}>↗ Link</a>
                          : <Muted />}
                      </td>
                    ))}
                  </>
                )}

                <td style={{ ...td, width: '48px', padding: '6px 8px' }}>
                  {canEdit && (
                    isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => save(brandId)} disabled={saving === brandId}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5', fontSize: '11px', cursor: 'pointer' }}>
                          {saving === brandId ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', background: 'transparent', fontSize: '11px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(brandId)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#fff0ec', cursor: 'pointer', color: '#e05c3a', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        ✏
                      </button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const GRID = '1px solid #c8c4bc';

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700,
  fontFamily: 'var(--font-mono)', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em',
  border: GRID, whiteSpace: 'nowrap', background: '#e8e5de',
};

const thLeft: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
  fontFamily: 'var(--font-mono)', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em',
  border: GRID, whiteSpace: 'nowrap', background: '#e8e5de',
};

const td: React.CSSProperties = {
  padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle',
  textAlign: 'center', border: GRID, fontFamily: 'var(--font-mono)', fontWeight: 500,
};

const tdLeft: React.CSSProperties = {
  padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle',
  textAlign: 'left', border: GRID, fontFamily: 'var(--font-mono)', fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px',
  padding: '4px 6px', border: '0.5px solid var(--border-strong)',
  borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)',
};

function Num({ v }: { v: any }) {
  if (v === null || v === undefined || v === '' || v === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{Number(v).toLocaleString()}</span>;
}

function Muted() { return <span style={{ color: 'var(--text-muted)' }}>—</span>; }
