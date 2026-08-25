'use client';

import { useState } from 'react';
import TrackerModal from '../tracker-modal';

type Props = {
  assignments: any[];
  monthlyEntries: any[];
  weeklyEntries: any[];
  weekStart: string;
  month: string;
  personId: string;
  canEdit: boolean;
  onSaved: () => void;
};

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round((a / b) * 100);
}

function daysInMonth(month: string) {
  const d = new Date(month + 'T00:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function weeksInMonth(month: string) {
  return Math.ceil(daysInMonth(month) / 7);
}

function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const color = value >= 80 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626';
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color }}>{value}%</span>;
}

function Delta({ curr, prev }: { curr: number | null; prev: number | null }) {
  if (curr === null || prev === null) return null;
  const diff = curr - prev;
  if (diff === 0) return null;
  const color = diff > 0 ? '#16a34a' : '#dc2626';
  const arrow = diff > 0 ? '↑' : '↓';
  return <div style={{ fontSize: '11px', color, marginTop: '2px' }}>{arrow} {Math.abs(diff).toLocaleString()}</div>;
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

export default function SocialTable({ assignments, monthlyEntries, weeklyEntries, weekStart, month, personId, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [trackerModal, setTrackerModal] = useState<{ brandId: string; type: 'orm' | 'ops' | 'social' } | null>(null);

  const days = daysInMonth(month);
  const weeks = weeksInMonth(month);

  function getEntry(brandId: string) {
    return monthlyEntries.find(e => e.brand_id === brandId);
  }

  function getWeekly(brandId: string, wk: string) {
    return weeklyEntries.find(e => e.brand_id === brandId && e.week_start === wk);
  }

  function getPrevWeek(ws: string) {
    const d = new Date(ws);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }

  function startEdit(brandId: string) {
    const entry = getEntry(brandId);
    setDrafts(prev => ({
      ...prev,
      [brandId]: {
        scope: entry?.metrics?.scope ?? '',
        tasks_completed: entry?.metrics?.tasks_completed ?? '',
        backlog: entry?.metrics?.backlog ?? '',
        backlog_completed: entry?.metrics?.backlog_completed ?? '',
        nps: entry?.metrics?.nps ?? '',
        invoice_cleared: entry?.metrics?.invoice_cleared ?? false,
        followers: getWeekly(brandId, weekStart)?.followers ?? '',
        er: getWeekly(brandId, weekStart)?.er ?? '',
        sov: getWeekly(brandId, weekStart)?.sov ?? '',
        profile_visits: getWeekly(brandId, weekStart)?.profile_visits ?? '',
        avg_vtr: getWeekly(brandId, weekStart)?.avg_vtr ?? '',
      }
    }));
    setEditing(brandId);
  }

  function setField(brandId: string, field: string, value: any) {
    setDrafts(prev => ({ ...prev, [brandId]: { ...prev[brandId], [field]: value } }));
  }

  async function save(brandId: string) {
    const d = drafts[brandId];
    if (!d) return;
    setSaving(brandId);
    const entry = getEntry(brandId);
    await Promise.all([
      fetch('/api/harmony-core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId, brand_id: brandId, month, role_type: 'social',
          metrics: {
            scope: Number(d.scope) || 0,
            tasks_completed: Number(d.tasks_completed) || 0,
            backlog: Number(d.backlog) || 0,
            backlog_completed: Number(d.backlog_completed) || 0,
            nps: Number(d.nps) || 0,
            invoice_cleared: d.invoice_cleared,
          },
          tracker_logs: entry?.tracker_logs ?? { orm: [], ops: [], social: [] },
        }),
      }),
      fetch('/api/harmony-core/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: personId, brand_id: brandId, week_start: weekStart,
          followers: Number(d.followers) || null,
          er: Number(d.er) || null,
          sov: Number(d.sov) || null,
          profile_visits: Number(d.profile_visits) || null,
          avg_vtr: Number(d.avg_vtr) || null,
        }),
      }),
    ]);
    setSaving(null);
    setEditing(null);
    onSaved();
  }

  function numInput(brandId: string, field: string, w = '60px') {
    return (
      <input type="number" value={drafts[brandId]?.[field] ?? ''} onChange={e => setField(brandId, field, e.target.value)}
        style={{ width: w, fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)' }} />
    );
  }

  return (
    <>
      {/* Section label */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--coral, #e05c3a)', marginBottom: '10px' }}>
        Social KPIs
      </div>

      <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #c8c4bc', borderRadius: '12px', boxShadow: '4px 4px 0 var(--ink, #0D0D0B)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1100px' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...thLeft, background: '#dedad2' }}>Brand</th>
              <th rowSpan={2} style={{ ...th, background: '#dedad2' }}>Scope Monthly</th>
              <th rowSpan={2} style={{ ...th, background: '#dedad2' }}>Backlog to Complete</th>
              <th rowSpan={2} style={{ ...th, background: '#c8e6c9', color: '#2e7d32' }}>Scope Done %</th>
              <th rowSpan={2} style={{ ...th, background: '#c8e6c9', color: '#2e7d32' }}>Backlog EOM %</th>
              <th rowSpan={2} style={{ ...th, background: '#dedad2' }}>NPS</th>
              <th rowSpan={2} style={{ ...th, background: '#dedad2' }}>Invoice (Y/N)</th>
              <th rowSpan={2} style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>ORM rate %</th>
              <th rowSpan={2} style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>Social tracker %</th>
              <th rowSpan={2} style={{ ...th, background: '#fce4d6', color: '#bf360c' }}>Ops tracker %</th>
              <th colSpan={5} style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>WoW (Week on Week)</th>
              <th rowSpan={2} style={{ ...th, background: '#dedad2', width: '48px' }}></th>
            </tr>
            <tr>
              <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>Followers</th>
              <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>ER %</th>
              <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>SOV %</th>
              <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>Profile Visits</th>
              <th style={{ ...th, background: '#e3f2fd', color: '#1565c0' }}>Avg VTR %</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a: any, rowIdx: number) => {
              const brand = a.brands;
              const brandId = a.brand_id;
              const brandName = brand?.name ?? brandId;
              const entry = getEntry(brandId);
              const m = entry?.metrics ?? {};
              const logs = entry?.tracker_logs ?? { orm: [], ops: [], social: [] };
              const currWeek = getWeekly(brandId, weekStart);
              const prevWeek = getWeekly(brandId, getPrevWeek(weekStart));
              const isEditing = editing === brandId;
              const isSaving = saving === brandId;
              const rowBg = rowIdx % 2 === 0 ? '#fff' : '#f9f8f5';

              const scopePct = pct(m.tasks_completed, m.scope);
              const backlogPct = pct(m.backlog_completed, m.backlog);
              const ormPct = days ? Math.round((logs.orm.length / days) * 100) : null;
              const opsPct = days ? Math.round((logs.ops.length / days) * 100) : null;
              const socialPct = weeks ? Math.round((logs.social.length / weeks) * 100) : null;

              const tdR = { ...td, background: rowBg };
              const tdLR = { ...tdLeft, background: rowBg };

              return (
                <tr key={brandId}>
                  {/* Brand with avatar */}
                  <td style={{ ...tdLR, minWidth: '160px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <BrandAvatar name={brandName} />
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>{brandName}</span>
                    </div>
                  </td>

                  {isEditing ? (
                    <>
                      <td style={tdR}>{numInput(brandId, 'scope')}</td>
                      <td style={tdR}>{numInput(brandId, 'backlog')}</td>
                      {/* hidden inputs for tasks_completed and backlog_completed — needed for calc */}
                      <td style={tdR}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <PctCell value={pct(Number(drafts[brandId]?.tasks_completed), Number(drafts[brandId]?.scope))} />
                          <input type="number" value={drafts[brandId]?.tasks_completed ?? ''} onChange={e => setField(brandId, 'tasks_completed', e.target.value)}
                            placeholder="done" style={{ width: '52px', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 5px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-1)', color: 'var(--text-muted)' }} />
                        </div>
                      </td>
                      <td style={tdR}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <PctCell value={pct(Number(drafts[brandId]?.backlog_completed), Number(drafts[brandId]?.backlog))} />
                          <input type="number" value={drafts[brandId]?.backlog_completed ?? ''} onChange={e => setField(brandId, 'backlog_completed', e.target.value)}
                            placeholder="done" style={{ width: '52px', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 5px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-1)', color: 'var(--text-muted)' }} />
                        </div>
                      </td>
                      <td style={tdR}>{numInput(brandId, 'nps', '50px')}</td>
                      <td style={tdR}>
                        <button onClick={() => setField(brandId, 'invoice_cleared', !drafts[brandId]?.invoice_cleared)}
                          style={{ padding: '3px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: drafts[brandId]?.invoice_cleared ? '#dcfce7' : '#fee2e2', color: drafts[brandId]?.invoice_cleared ? '#16a34a' : '#dc2626' }}>
                          {drafts[brandId]?.invoice_cleared ? 'Y' : 'N'}
                        </button>
                      </td>
                      <td style={tdR}><PctCell value={ormPct} /></td>
                      <td style={tdR}><PctCell value={socialPct} /></td>
                      <td style={tdR}><PctCell value={opsPct} /></td>
                      <td style={tdR}>{numInput(brandId, 'followers', '70px')}</td>
                      <td style={tdR}>{numInput(brandId, 'er', '55px')}</td>
                      <td style={tdR}>{numInput(brandId, 'sov', '55px')}</td>
                      <td style={tdR}>{numInput(brandId, 'profile_visits', '70px')}</td>
                      <td style={tdR}>{numInput(brandId, 'avg_vtr', '55px')}</td>
                    </>
                  ) : (
                    <>
                      <td style={tdR}><Num v={m.scope} /></td>
                      <td style={tdR}><Num v={m.backlog} /></td>
                      <td style={tdR}><PctCell value={scopePct} /></td>
                      <td style={tdR}><PctCell value={backlogPct} /></td>
                      <td style={tdR}><Num v={m.nps} /></td>
                      <td style={tdR}>
                        {entry
                          ? <span style={{ padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: m.invoice_cleared ? '#dcfce7' : '#fee2e2', color: m.invoice_cleared ? '#16a34a' : '#dc2626' }}>{m.invoice_cleared ? 'Y' : 'N'}</span>
                          : <Muted />}
                      </td>
                      <td style={{ ...tdR, cursor: canEdit ? 'pointer' : 'default' }} title={canEdit ? 'Click to log daily updates' : ''} onClick={() => canEdit && setTrackerModal({ brandId, type: 'orm' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <PctCell value={ormPct} />
                          {canEdit && <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.7 }}>✎</span>}
                        </div>
                      </td>
                      <td style={{ ...tdR, cursor: canEdit ? 'pointer' : 'default' }} title={canEdit ? 'Click to log weekly updates' : ''} onClick={() => canEdit && setTrackerModal({ brandId, type: 'social' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <PctCell value={socialPct} />
                          {canEdit && <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.7 }}>✎</span>}
                        </div>
                      </td>
                      <td style={{ ...tdR, cursor: canEdit ? 'pointer' : 'default' }} title={canEdit ? 'Click to log daily updates' : ''} onClick={() => canEdit && setTrackerModal({ brandId, type: 'ops' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <PctCell value={opsPct} />
                          {canEdit && <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.7 }}>✎</span>}
                        </div>
                      </td>
                      <td style={tdR}>
                        <Num v={currWeek?.followers} />
                        <Delta curr={currWeek?.followers ?? null} prev={prevWeek?.followers ?? null} />
                      </td>
                      <td style={tdR}>
                        <Num v={currWeek?.er} suffix="%" />
                        <Delta curr={currWeek?.er ?? null} prev={prevWeek?.er ?? null} />
                      </td>
                      <td style={tdR}>
                        <Num v={currWeek?.sov} suffix="%" />
                        <Delta curr={currWeek?.sov ?? null} prev={prevWeek?.sov ?? null} />
                      </td>
                      <td style={tdR}>
                        <Num v={currWeek?.profile_visits} />
                        <Delta curr={currWeek?.profile_visits ?? null} prev={prevWeek?.profile_visits ?? null} />
                      </td>
                      <td style={tdR}>
                        <Num v={currWeek?.avg_vtr} suffix="%" />
                        <Delta curr={currWeek?.avg_vtr ?? null} prev={prevWeek?.avg_vtr ?? null} />
                      </td>
                    </>
                  )}

                  {/* Action column */}
                  <td style={{ ...tdR, width: '48px', padding: '6px 8px' }}>
                    {canEdit && (
                      isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <button onClick={() => save(brandId)} disabled={isSaving}
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {isSaving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditing(null)}
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', background: 'transparent', fontSize: '11px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(brandId)} title="Edit row"
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

      {trackerModal && (
        <TrackerModal
          brandId={trackerModal.brandId}
          type={trackerModal.type}
          month={month}
          personId={personId}
          entry={monthlyEntries.find(e => e.brand_id === trackerModal.brandId)}
          onClose={() => setTrackerModal(null)}
          onSaved={() => { setTrackerModal(null); onSaved(); }}
        />
      )}
    </>
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

function Num({ v, suffix = '' }: { v: any; suffix?: string }) {
  if (v === null || v === undefined || v === '' || v === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{Number(v).toLocaleString()}{suffix}</span>;
}

function Muted() {
  return <span style={{ color: 'var(--text-muted)' }}>—</span>;
}
