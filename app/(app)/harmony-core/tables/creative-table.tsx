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
  { key: 'trend_link', label: 'Trend' },
  { key: 'moment_marketing_link', label: 'Moment' },
  { key: 'reel_10k_link', label: 'Reel 10k' },
  { key: 'high_vtr_link', label: 'High VTR' },
  { key: 'high_engagement_link', label: 'Engagement' },
  { key: 'brand_appreciated_link', label: 'Brand Pick' },
];

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
    <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
        <thead>
          <tr style={{ background: 'var(--surface-1)' }}>
            <th style={th}>Brand</th>
            <th style={th}>NPS</th>
            <th style={th}>New Idea</th>
            {LINK_FIELDS.map(f => <th key={f.key} style={th}>{f.label}</th>)}
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a: any) => {
            const brandId = a.brand_id;
            const entry = getEntry(brandId);
            const m = entry?.metrics ?? {};
            const isEditing = editing === brandId;
            const d = drafts[brandId] ?? {};

            return (
              <tr key={brandId} style={{ borderTop: '0.5px solid var(--border)' }}>
                <td style={td}><span style={{ fontWeight: 500 }}>{a.brands?.name ?? brandId}</span></td>

                {isEditing ? (
                  <>
                    <td style={td}>
                      <input type="number" value={d.nps} onChange={e => setField(brandId, 'nps', e.target.value)}
                        style={{ width: '55px', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
                    </td>
                    <td style={td}>
                      <input type="text" value={d.new_idea} onChange={e => setField(brandId, 'new_idea', e.target.value)}
                        placeholder="Write idea..."
                        style={{ width: '140px', fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
                    </td>
                    {LINK_FIELDS.map(f => (
                      <td key={f.key} style={td}>
                        <input type="url" value={d[f.key]} onChange={e => setField(brandId, f.key, e.target.value)}
                          placeholder="Paste link..."
                          style={{ width: '110px', fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
                      </td>
                    ))}
                  </>
                ) : (
                  <>
                    <td style={td}><Num v={m.nps} /></td>
                    <td style={{ ...td, maxWidth: '160px' }}>
                      {m.new_idea
                        ? <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.new_idea}</span>
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

                <td style={{ ...td, textAlign: 'right' }}>
                  {canEdit && (
                    isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => save(brandId)} disabled={saving === brandId}
                          style={{ padding: '4px 10px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5', fontSize: '11px', cursor: 'pointer' }}>
                          {saving === brandId ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)}
                          style={{ padding: '4px 10px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', background: 'transparent', fontSize: '11px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(brandId)}
                        style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px' }}>
                        Edit
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

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
};

const td: React.CSSProperties = { padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle' };

function Num({ v }: { v: any }) {
  if (v === null || v === undefined || v === '' || v === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{Number(v).toLocaleString()}</span>;
}

function Muted() { return <span style={{ color: 'var(--text-muted)' }}>—</span>; }
