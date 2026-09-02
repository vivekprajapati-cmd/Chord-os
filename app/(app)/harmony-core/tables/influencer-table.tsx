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

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round((a / b) * 100);
}

function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const color = value >= 80 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626';
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color }}>{value}%</span>;
}

function YNBadge({ value }: { value: boolean }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, background: value ? '#dcfce7' : '#fee2e2', color: value ? '#16a34a' : '#dc2626' }}>
      {value ? 'Y' : 'N'}
    </span>
  );
}

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

export default function InfluencerTable({ assignments, entries, month, personId, canEdit, onSaved }: Props) {
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
        nature: m.nature ?? 'retainer',
        nps: m.nps ?? '',
        scope: m.scope ?? '',
        shortlisted: m.shortlisted ?? '',
        executed: m.executed ?? '',
        gone_live: m.gone_live ?? '',
        influencer_tracker_rate: m.influencer_tracker_rate ?? '',
        po_raised: m.po_raised ?? false,
        advance_received: m.advance_received ?? false,
        invoice_closed: m.invoice_closed ?? false,
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
    try {
      const res = await fetch('/api/harmony-core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId,
          brand_id: brandId,
          month,
          role_type: 'influencer',
          metrics: {
            nature: d.nature,
            nps: Number(d.nps) || 0,
            scope: Number(d.scope) || 0,
            shortlisted: Number(d.shortlisted) || 0,
            executed: Number(d.executed) || 0,
            gone_live: Number(d.gone_live) || 0,
            influencer_tracker_rate: Number(d.influencer_tracker_rate) || 0,
            po_raised: d.po_raised,
            advance_received: d.advance_received,
            invoice_closed: d.invoice_closed,
          },
          tracker_logs: { orm: [], ops: [], social: [] },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Save failed: ${err.error ?? 'unknown error'}`);
        return;
      }
      setEditing(null);
      onSaved();
    } catch (e) {
      alert(`Save failed: ${String(e)}`);
    } finally {
      setSaving(null);
    }
  }

  function numInput(brandId: string, field: string) {
    return (
      <input type="number" value={drafts[brandId]?.[field] ?? ''} onChange={e => setField(brandId, field, e.target.value)}
        style={inputStyle} />
    );
  }

  function toggleBtn(brandId: string, field: string) {
    const val = drafts[brandId]?.[field] ?? false;
    return (
      <button onClick={() => setField(brandId, field, !val)}
        style={{ padding: '3px 10px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, background: val ? '#dcfce7' : '#fee2e2', color: val ? '#16a34a' : '#dc2626' }}>
        {val ? 'Y' : 'N'}
      </button>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #c8c4bc', borderRadius: '12px', boxShadow: '4px 4px 0 var(--ink, #0D0D0B)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
        <thead>
          <tr>
            <th style={{ ...th, background: '#dedad2', width: '48px' }}></th>
            <th style={{ ...thLeft, background: '#dedad2' }}>Brand</th>
            <th style={{ ...th, background: '#dedad2' }}>Nature</th>
            <th style={{ ...th, background: '#dedad2' }}>Brand NPS</th>
            <th style={{ ...th, background: '#c8e6c9', color: '#2e7d32' }}>Scope (Monthly)</th>
            <th style={{ ...th, background: '#dedad2' }}>Shortlisted</th>
            <th style={{ ...th, background: '#dedad2' }}>Executed</th>
            <th style={{ ...th, background: '#dedad2' }}>Gone Live</th>
            <th style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>Shortlist Rate</th>
            <th style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>Execution Rate</th>
            <th style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>Go Live Rate</th>
            <th style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>Influencer Tracker (Weekly)</th>
            <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>PO Raised</th>
            <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>Advance Received</th>
            <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>Invoice Closed</th>
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

            const shortlistPct = pct(m.shortlisted, m.scope);
            const executionPct = pct(m.executed, m.shortlisted);
            const goLivePct = pct(m.gone_live, m.executed);

            return (
              <tr key={brandId}>
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
                <td style={{ ...tdLeft, minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BrandAvatar name={brandName} />
                    <span style={{ fontWeight: 500 }}>{brandName}</span>
                  </div>
                </td>

                {isEditing ? (
                  <>
                    <td style={td}>
                      <select value={d.nature} onChange={e => setField(brandId, 'nature', e.target.value)}
                        style={{ fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                        <option value="retainer">Retainer</option>
                        <option value="project">Project</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </td>
                    <td style={td}>{numInput(brandId, 'nps')}</td>
                    <td style={td}>{numInput(brandId, 'scope')}</td>
                    <td style={td}>{numInput(brandId, 'shortlisted')}</td>
                    <td style={td}>{numInput(brandId, 'executed')}</td>
                    <td style={td}>{numInput(brandId, 'gone_live')}</td>
                    <td style={td}><PctCell value={pct(Number(d.shortlisted), Number(d.scope))} /></td>
                    <td style={td}><PctCell value={pct(Number(d.executed), Number(d.shortlisted))} /></td>
                    <td style={td}><PctCell value={pct(Number(d.gone_live), Number(d.executed))} /></td>
                    <td style={td}>{numInput(brandId, 'influencer_tracker_rate')}</td>
                    <td style={td}>{toggleBtn(brandId, 'po_raised')}</td>
                    <td style={td}>{toggleBtn(brandId, 'advance_received')}</td>
                    <td style={td}>{toggleBtn(brandId, 'invoice_closed')}</td>
                  </>
                ) : (
                  <>
                    <td style={td}><span style={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{m.nature ?? '—'}</span></td>
                    <td style={td}><Num v={m.nps} /></td>
                    <td style={td}><Num v={m.scope} /></td>
                    <td style={td}><Num v={m.shortlisted} /></td>
                    <td style={td}><Num v={m.executed} /></td>
                    <td style={td}><Num v={m.gone_live} /></td>
                    <td style={td}><PctCell value={shortlistPct} /></td>
                    <td style={td}><PctCell value={executionPct} /></td>
                    <td style={td}><PctCell value={goLivePct} /></td>
                    <td style={td}><Num v={m.influencer_tracker_rate} suffix="%" /></td>
                    <td style={td}>{entry ? <YNBadge value={!!m.po_raised} /> : <Muted />}</td>
                    <td style={td}>{entry ? <YNBadge value={!!m.advance_received} /> : <Muted />}</td>
                    <td style={td}>{entry ? <YNBadge value={!!m.invoice_closed} /> : <Muted />}</td>
                  </>
                )}

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

function Num({ v, suffix = '' }: { v: any; suffix?: string }) {
  if (v === null || v === undefined || v === '' || v === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{Number(v).toLocaleString()}{suffix}</span>;
}

function Muted() { return <span style={{ color: 'var(--text-muted)' }}>—</span>; }
