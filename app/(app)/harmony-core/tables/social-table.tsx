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
  const color = value >= 80 ? 'var(--text-success)' : value >= 50 ? '#b45309' : 'var(--text-danger)';
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color }}>{value}%</span>;
}

function Delta({ curr, prev }: { curr: number | null; prev: number | null }) {
  if (curr === null || prev === null) return null;
  const diff = curr - prev;
  if (diff === 0) return null;
  const color = diff > 0 ? 'var(--text-success)' : 'var(--text-danger)';
  const arrow = diff > 0 ? '↑' : '↓';
  return <div style={{ fontSize: '11px', color }}>{arrow} {Math.abs(diff).toLocaleString()}</div>;
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

  function getPrevWeek(weekStart: string) {
    const d = new Date(weekStart);
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
        // WoW
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
          person_id: personId,
          brand_id: brandId,
          month,
          role_type: 'social',
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
          person_id: personId,
          brand_id: brandId,
          week_start: weekStart,
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

  function numInput(brandId: string, field: string, placeholder = '—') {
    return (
      <input
        type="number"
        value={drafts[brandId]?.[field] ?? ''}
        onChange={e => setField(brandId, field, e.target.value)}
        placeholder={placeholder}
        style={{ width: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '4px 6px', border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
      />
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-1)' }}>
              <th rowSpan={2} style={th}>Brand</th>
              <th rowSpan={2} style={th}>Scope</th>
              <th rowSpan={2} style={th}>Done</th>
              <th rowSpan={2} style={th}>Backlog</th>
              <th rowSpan={2} style={th}>B. Done</th>
              <th rowSpan={2} style={{ ...th, color: 'var(--text-accent)' }}>Scope %</th>
              <th rowSpan={2} style={{ ...th, color: 'var(--text-accent)' }}>Backlog %</th>
              <th rowSpan={2} style={th}>NPS</th>
              <th rowSpan={2} style={th}>Invoice</th>
              <th rowSpan={2} style={{ ...th, color: 'var(--text-accent)' }}>ORM %</th>
              <th rowSpan={2} style={{ ...th, color: 'var(--text-accent)' }}>Social %</th>
              <th rowSpan={2} style={{ ...th, color: 'var(--text-accent)' }}>Ops %</th>
              <th colSpan={5} style={{ ...th, textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>WoW (Week on Week)</th>
              <th rowSpan={2} style={th}></th>
            </tr>
            <tr style={{ background: 'var(--surface-1)' }}>
              <th style={th}>Followers</th>
              <th style={th}>ER %</th>
              <th style={th}>SOV %</th>
              <th style={th}>Visits</th>
              <th style={th}>Avg VTR %</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a: any) => {
              const brand = a.brands;
              const brandId = a.brand_id;
              const entry = getEntry(brandId);
              const m = entry?.metrics ?? {};
              const logs = entry?.tracker_logs ?? { orm: [], ops: [], social: [] };
              const currWeek = getWeekly(brandId, weekStart);
              const prevWeek = getWeekly(brandId, getPrevWeek(weekStart));
              const isEditing = editing === brandId;
              const isSaving = saving === brandId;

              const scopePct = pct(m.tasks_completed, m.scope);
              const backlogPct = pct(m.backlog_completed, m.backlog);
              const ormPct = days ? Math.round((logs.orm.length / days) * 100) : null;
              const opsPct = days ? Math.round((logs.ops.length / days) * 100) : null;
              const socialPct = weeks ? Math.round((logs.social.length / weeks) * 100) : null;

              return (
                <tr key={brandId} style={{ borderTop: '0.5px solid var(--border)' }}>
                  <td style={td}><span style={{ fontWeight: 500 }}>{brand?.name ?? brandId}</span></td>

                  {isEditing ? (
                    <>
                      <td style={td}>{numInput(brandId, 'scope')}</td>
                      <td style={td}>{numInput(brandId, 'tasks_completed')}</td>
                      <td style={td}>{numInput(brandId, 'backlog')}</td>
                      <td style={td}>{numInput(brandId, 'backlog_completed')}</td>
                      <td style={td}><PctCell value={pct(Number(drafts[brandId]?.tasks_completed), Number(drafts[brandId]?.scope))} /></td>
                      <td style={td}><PctCell value={pct(Number(drafts[brandId]?.backlog_completed), Number(drafts[brandId]?.backlog))} /></td>
                      <td style={td}>{numInput(brandId, 'nps')}</td>
                      <td style={td}>
                        <button onClick={() => setField(brandId, 'invoice_cleared', !drafts[brandId]?.invoice_cleared)}
                          style={{ padding: '3px 10px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, background: drafts[brandId]?.invoice_cleared ? 'var(--bg-success)' : 'var(--bg-danger)', color: drafts[brandId]?.invoice_cleared ? 'var(--text-success)' : 'var(--text-danger)' }}>
                          {drafts[brandId]?.invoice_cleared ? 'Y' : 'N'}
                        </button>
                      </td>
                      <td style={td}><PctCell value={ormPct} /></td>
                      <td style={td}><PctCell value={socialPct} /></td>
                      <td style={td}><PctCell value={opsPct} /></td>
                      <td style={td}>{numInput(brandId, 'followers')}</td>
                      <td style={td}>{numInput(brandId, 'er')}</td>
                      <td style={td}>{numInput(brandId, 'sov')}</td>
                      <td style={td}>{numInput(brandId, 'profile_visits')}</td>
                      <td style={td}>{numInput(brandId, 'avg_vtr')}</td>
                    </>
                  ) : (
                    <>
                      <td style={td}><Num v={m.scope} /></td>
                      <td style={td}><Num v={m.tasks_completed} /></td>
                      <td style={td}><Num v={m.backlog} /></td>
                      <td style={td}><Num v={m.backlog_completed} /></td>
                      <td style={td}><PctCell value={scopePct} /></td>
                      <td style={td}><PctCell value={backlogPct} /></td>
                      <td style={td}><Num v={m.nps} /></td>
                      <td style={td}>
                        {entry ? (
                          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, background: m.invoice_cleared ? 'var(--bg-success)' : 'var(--bg-danger)', color: m.invoice_cleared ? 'var(--text-success)' : 'var(--text-danger)' }}>
                            {m.invoice_cleared ? 'Y' : 'N'}
                          </span>
                        ) : <Muted />}
                      </td>
                      <td style={{ ...td, cursor: canEdit ? 'pointer' : 'default' }} onClick={() => canEdit && setTrackerModal({ brandId, type: 'orm' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <PctCell value={ormPct} />
                          {canEdit && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>✎</span>}
                        </div>
                      </td>
                      <td style={{ ...td, cursor: canEdit ? 'pointer' : 'default' }} onClick={() => canEdit && setTrackerModal({ brandId, type: 'social' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <PctCell value={socialPct} />
                          {canEdit && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>✎</span>}
                        </div>
                      </td>
                      <td style={{ ...td, cursor: canEdit ? 'pointer' : 'default' }} onClick={() => canEdit && setTrackerModal({ brandId, type: 'ops' })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <PctCell value={opsPct} />
                          {canEdit && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>✎</span>}
                        </div>
                      </td>
                      <td style={td}>
                        <div><Num v={currWeek?.followers} /></div>
                        <Delta curr={currWeek?.followers ?? null} prev={prevWeek?.followers ?? null} />
                      </td>
                      <td style={td}>
                        <div><Num v={currWeek?.er} suffix="%" /></div>
                        <Delta curr={currWeek?.er ?? null} prev={prevWeek?.er ?? null} />
                      </td>
                      <td style={td}>
                        <div><Num v={currWeek?.sov} suffix="%" /></div>
                        <Delta curr={currWeek?.sov ?? null} prev={prevWeek?.sov ?? null} />
                      </td>
                      <td style={td}>
                        <div><Num v={currWeek?.profile_visits} /></div>
                        <Delta curr={currWeek?.profile_visits ?? null} prev={prevWeek?.profile_visits ?? null} />
                      </td>
                      <td style={td}>
                        <div><Num v={currWeek?.avg_vtr} suffix="%" /></div>
                        <Delta curr={currWeek?.avg_vtr ?? null} prev={prevWeek?.avg_vtr ?? null} />
                      </td>
                    </>
                  )}

                  <td style={{ ...td, textAlign: 'right' }}>
                    {canEdit && (
                      isEditing ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => save(brandId)} disabled={isSaving}
                            style={{ padding: '4px 10px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5', fontSize: '11px', cursor: 'pointer' }}>
                            {isSaving ? '...' : 'Save'}
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

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 500,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle',
};

function Num({ v, suffix = '' }: { v: any; suffix?: string }) {
  if (v === null || v === undefined || v === '' || v === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{Number(v).toLocaleString()}{suffix}</span>;
}

function Muted() {
  return <span style={{ color: 'var(--text-muted)' }}>—</span>;
}
