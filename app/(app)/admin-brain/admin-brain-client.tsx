'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type Snapshot = { total: string; completed: string; remaining: string; pct_complete: string; overdue: string; high_priority: string; as_of: string };
type StageRow = { stage: string; team: string; open: string };
type TeamRow = { team: string; open: string };
type StatusRow = { status: string; count: string };
type PriorityTask = { rank: string; brand: string; month: string; remaining: string; deadline: string; days_left: string; status: string; priority: string };
type TrackerRow = { brand: string; month: string; total: string; static: string; pending_shoot: string; in_progress: string; shot_ne: string; ai_mg: string; influencer: string; stories: string; completed: string; remaining: string; deadline: string; days_left: string; pct_complete: string; status: string; priority: string };
type LogRow = { date: string; brand_month: string; qty: string; note: string };

type SheetData = {
  snapshot: Snapshot;
  stageMapping: StageRow[];
  teamBreakdown: TeamRow[];
  statusBreakdown: StatusRow[];
  priorityTasks: PriorityTask[];
  tracker: TrackerRow[];
  dailyLog: LogRow[];
};

const mono: React.CSSProperties = { fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' };
const label: React.CSSProperties = { ...mono, color: 'var(--gray)' };

function statusColor(s: string) {
  if (s === 'Overdue') return 'var(--red)';
  if (s === 'At Risk') return 'var(--coral)';
  if (s === 'Behind') return '#f59e0b';
  if (s === 'On Track') return '#22c55e';
  if (s === 'Done') return 'var(--gray)';
  return 'var(--ink)';
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ ...label, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{children}</th>;
}
function Td({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return <td style={{ ...mono, fontSize: '11px', textTransform: 'none', padding: '8px 12px', borderBottom: '1px solid var(--line)', color: red ? 'var(--red)' : 'var(--ink)' }}>{children}</td>;
}

export default function AdminBrainClient({ initialSheetUrl }: { initialSheetUrl: string }) {
  const [sheetUrl, setSheetUrl] = useState(initialSheetUrl);
  const [inputUrl, setInputUrl] = useState(initialSheetUrl);
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'snapshot' | 'stages' | 'teams' | 'status' | 'priority' | 'tracker' | 'log'>('snapshot');

  const now = new Date();
  const currentMonth = now.toLocaleString('en-US', { month: 'short' }) + ' ' + now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const selectedMonthRef = useRef(selectedMonth);
  selectedMonthRef.current = selectedMonth;

  const monthOptions = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear();
  });

  const fetchData = useCallback(async (month?: string) => {
    const m = month ?? selectedMonthRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin-brain/sheet?month=${encodeURIComponent(m)}`);
      if (!res.ok) {
        const e = await res.json();
        if (e.error === 'no_sheet_url') { setError('No sheet URL set. Add one above.'); return; }
        setError(e.error ?? 'Failed to load sheet.');
        return;
      }
      setData(await res.json());
      setLastSynced(new Date());
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { if (sheetUrl) fetchData(); }, [sheetUrl]); // eslint-disable-line

  // Auto-refresh on page focus
  useEffect(() => {
    const onFocus = () => { if (sheetUrl) fetchData(); };
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') onFocus(); });
    return () => window.removeEventListener('visibilitychange', onFocus);
  }, [sheetUrl, fetchData]);

  async function saveUrl() {
    setSaving(true);
    await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'backlog_sheet_url', value: inputUrl.trim() }), headers: { 'Content-Type': 'application/json' } });
    setSheetUrl(inputUrl.trim());
    setSaving(false);
  }

  function formatSynced(d: Date) {
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  const tabs = [
    { key: 'snapshot', label: 'Snapshot' },
    { key: 'stages', label: 'Stage Map' },
    { key: 'teams', label: 'By Team' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'tracker', label: 'Tracker' },
    { key: 'log', label: 'Daily Log' },
  ] as const;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '4px' }}>
        <h1 className="font-display text-5xl uppercase tracking-tight">Admin Brain</h1>
        {lastSynced && (
          <span style={{ ...label }}>Synced {formatSynced(lastSynced)}</span>
        )}
      </div>
      <p style={{ ...label, marginBottom: '24px' }}>Backlog dashboard — live from Google Sheets</p>

      {/* Sheet URL input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center' }}>
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          placeholder="Paste Google Sheet URL (must be shared: anyone with link can view)"
          style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '9px 18px', fontFamily: 'var(--f-mono)', fontSize: '11px', outline: 'none', color: 'var(--ink)' }}
        />
        <button onClick={saveUrl} disabled={saving || !inputUrl.trim()} style={{ ...mono, background: 'var(--ink)', color: 'var(--cream)', padding: '9px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving…' : 'Save & Sync'}
        </button>
        {sheetUrl && (
          <button onClick={() => fetchData()} disabled={loading} style={{ ...mono, background: 'transparent', border: '1px solid var(--line)', color: 'var(--gray)', padding: '9px 16px', borderRadius: '999px', cursor: 'pointer' }}>
            {loading ? '…' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={label}>Month:</span>
        {monthOptions.map(m => (
          <button key={m} onClick={() => { setSelectedMonth(m); fetchData(m); }}
            style={{ ...mono, padding: '5px 12px', borderRadius: '999px', border: `1px solid ${selectedMonth === m ? 'var(--ink)' : 'var(--line)'}`, background: selectedMonth === m ? 'var(--ink)' : 'transparent', color: selectedMonth === m ? 'var(--cream)' : 'var(--gray)', cursor: 'pointer' }}>
            {m}
          </button>
        ))}
      </div>

      {error && <p style={{ ...mono, color: 'var(--red)', marginBottom: '16px' }}>{error}</p>}
      {loading && <p style={label}>Loading sheet data…</p>}

      {data && (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ ...mono, padding: '6px 14px', borderRadius: '999px', border: `1px solid ${activeTab === t.key ? 'var(--ink)' : 'var(--line)'}`, background: activeTab === t.key ? 'var(--ink)' : 'transparent', color: activeTab === t.key ? 'var(--cream)' : 'var(--gray)', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Snapshot */}
          {activeTab === 'snapshot' && (
            <div>
              <p style={{ ...label, marginBottom: '16px' }}>As of {data.snapshot.as_of} — all months aggregate</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Backlog', value: data.snapshot.total },
                  { label: 'Completed', value: data.snapshot.completed },
                  { label: 'Remaining', value: data.snapshot.remaining },
                  { label: '% Complete', value: data.snapshot.pct_complete },
                  { label: 'Overdue', value: data.snapshot.overdue, red: true },
                  { label: 'High Priority', value: data.snapshot.high_priority, red: true },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', padding: '16px 20px' }}>
                    <p style={label}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--f-display)', fontSize: '36px', color: s.red ? 'var(--red)' : 'var(--ink)', lineHeight: 1, marginTop: '6px' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage Map */}
          {activeTab === 'stages' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                <thead><tr><Th>Stage</Th><Th>Team</Th><Th>Open</Th></tr></thead>
                <tbody>{data.stageMapping.map((r, i) => <tr key={i}><Td>{r.stage}</Td><Td>{r.team}</Td><Td>{r.open}</Td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* By Team — bar chart */}
          {activeTab === 'teams' && (() => {
            const max = Math.max(...data.teamBreakdown.map(r => parseInt(r.open) || 0));
            const W = 560, H = 260, pad = { top: 20, right: 20, bottom: 60, left: 50 };
            const bW = Math.floor((W - pad.left - pad.right) / data.teamBreakdown.length);
            const gap = Math.floor(bW * 0.25);
            return (
              <div style={{ background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', padding: '24px', overflowX: 'auto' }}>
                <p style={{ ...mono, marginBottom: '16px' }}>Open Tasks by Team</p>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
                  {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const y = pad.top + (1 - t) * (H - pad.top - pad.bottom);
                    return <g key={t}>
                      <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
                      <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="var(--gray)" fontFamily="var(--f-mono)">{Math.round(t * max)}</text>
                    </g>;
                  })}
                  {data.teamBreakdown.map((r, i) => {
                    const val = parseInt(r.open) || 0;
                    const bH = max > 0 ? (val / max) * (H - pad.top - pad.bottom) : 0;
                    const x = pad.left + i * bW + gap / 2;
                    const y = pad.top + (H - pad.top - pad.bottom) - bH;
                    return <g key={i}>
                      <rect x={x} y={y} width={bW - gap} height={bH} fill="var(--cobalt)" rx="3" />
                      <text x={x + (bW - gap) / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="var(--ink)" fontFamily="var(--f-mono)">{val}</text>
                      <text x={x + (bW - gap) / 2} y={H - pad.bottom + 16} textAnchor="middle" fontSize="9" fill="var(--gray)" fontFamily="var(--f-mono)">{r.team.replace(' Team', '')}</text>
                    </g>;
                  })}
                  <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} stroke="var(--ink)" strokeWidth="1" />
                </svg>
              </div>
            );
          })()}

          {/* Status Breakdown — pie chart */}
          {activeTab === 'status' && (() => {
            const items = data.statusBreakdown.filter(r => parseInt(r.count) > 0);
            const total = items.reduce((s, r) => s + (parseInt(r.count) || 0), 0);
            const COLORS = ['#22c55e', '#3b82f6', 'var(--coral)', '#f59e0b', 'var(--red)', 'var(--gray)'];
            const cx = 120, cy = 110, r = 90;
            let angle = -Math.PI / 2;
            const slices = items.map((item, i) => {
              const pct = (parseInt(item.count) || 0) / (total || 1);
              const start = angle;
              angle += pct * 2 * Math.PI;
              const end = angle;
              const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
              const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
              const large = end - start > Math.PI ? 1 : 0;
              return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color: COLORS[i % COLORS.length], label: item.status, count: item.count };
            });
            return (
              <div style={{ background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', padding: '24px' }}>
                <p style={{ ...mono, marginBottom: '16px' }}>Status Breakdown</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                  <svg viewBox="0 0 240 220" style={{ width: 220, flexShrink: 0 }}>
                    {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="var(--paper)" strokeWidth="2" />)}
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {slices.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ ...mono, fontSize: '11px', color: 'var(--ink)' }}>{s.label}</span>
                        <span style={{ ...mono, fontSize: '11px', color: 'var(--gray)' }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Priority Tasks */}
          {activeTab === 'priority' && (() => {
            const shortMonth = selectedMonth.split(' ')[0];
            const filtered = data.priorityTasks.filter(r => r.month === shortMonth);
            return (
              <div style={{ overflowX: 'auto' }}>
                {filtered.length === 0 && <p style={{ ...label, marginBottom: '12px' }}>No priority tasks for {selectedMonth}.</p>}
                {filtered.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                    <thead><tr><Th>#</Th><Th>Brand</Th><Th>Month</Th><Th>Remaining</Th><Th>Deadline</Th><Th>Days Left</Th><Th>Status</Th><Th>Priority</Th></tr></thead>
                    <tbody>{filtered.map((r, i) => (
                      <tr key={i} style={{ background: r.status === 'Overdue' ? 'rgba(var(--red-rgb, 220,38,38),0.06)' : undefined }}>
                        <Td>{r.rank}</Td><Td>{r.brand}</Td><Td>{r.month}</Td>
                        <Td red={parseInt(r.remaining) > 0}>{r.remaining}</Td>
                        <Td>{r.deadline}</Td>
                        <Td red={parseInt(r.days_left) <= 0}>{parseInt(r.days_left) <= 0 ? 'Overdue' : r.days_left}</Td>
                        <td style={{ ...mono, fontSize: '11px', textTransform: 'none', padding: '8px 12px', borderBottom: '1px solid var(--line)', color: statusColor(r.status) }}>{r.status}</td>
                        <Td>{r.priority}</Td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            );
          })()}

          {/* Tracker */}
          {activeTab === 'tracker' && (() => {
            const shortMonth = selectedMonth.split(' ')[0];
            const filtered = data.tracker.filter(r => r.month === shortMonth);
            return (
              <div style={{ overflowX: 'auto', marginLeft: 'clamp(-16px, -4vw, -48px)', marginRight: 'clamp(-16px, -4vw, -48px)', paddingLeft: 'clamp(16px, 4vw, 48px)', paddingRight: 'clamp(16px, 4vw, 48px)' }}>
                {filtered.length === 0 && <p style={label}>No tracker data for {selectedMonth}.</p>}
                {filtered.length > 0 && (
                  <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                    <thead><tr><Th>Brand</Th><Th>Month</Th><Th>Total</Th><Th>Static</Th><Th>Pend. Shoot</Th><Th>In Progress</Th><Th>Shot-NE</Th><Th>AI/MG</Th><Th>Influencer</Th><Th>Stories</Th><Th>Done</Th><Th>Remaining</Th><Th>Deadline</Th><Th>Days Left</Th><Th>%</Th><Th>Status</Th></tr></thead>
                    <tbody>{filtered.map((r, i) => {
                      const isOverdue = r.status === 'Overdue';
                      const rowBg = isOverdue ? 'rgba(220,38,38,0.06)' : undefined;
                      return (
                        <tr key={i} style={{ background: rowBg }}>
                          <Td>{r.brand}</Td><Td>{r.month}</Td><Td>{r.total}</Td>
                          <Td>{r.static || '-'}</Td><Td>{r.pending_shoot || '-'}</Td><Td>{r.in_progress || '-'}</Td>
                          <Td>{r.shot_ne || '-'}</Td><Td>{r.ai_mg || '-'}</Td><Td>{r.influencer || '-'}</Td><Td>{r.stories || '-'}</Td>
                          <Td>{r.completed}</Td><Td red={parseInt(r.remaining) > 0}>{r.remaining}</Td>
                          <Td>{r.deadline}</Td>
                          <Td red={parseInt(r.days_left) <= 0}>{parseInt(r.days_left) <= 0 ? 'Overdue' : r.days_left}</Td>
                          <Td>{r.pct_complete}</Td>
                          <td style={{ ...mono, fontSize: '11px', textTransform: 'none', padding: '8px 12px', borderBottom: '1px solid var(--line)', color: statusColor(r.status) }}>{r.status}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </div>
            );
          })()}

          {/* Daily Log */}
          {activeTab === 'log' && (() => {
            const shortMonth = selectedMonth.split(' ')[0];
            const filtered = data.dailyLog.filter(r => r.brand_month?.includes(shortMonth));
            return (
              <div style={{ overflowX: 'auto' }}>
                {filtered.length === 0
                  ? <p style={label}>No daily log entries for {selectedMonth}.</p>
                  : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                      <thead><tr><Th>Date</Th><Th>Brand : Month</Th><Th>Qty Completed</Th><Th>Note</Th></tr></thead>
                      <tbody>{filtered.map((r, i) => <tr key={i}><Td>{r.date}</Td><Td>{r.brand_month}</Td><Td>{r.qty}</Td><Td>{r.note || '-'}</Td></tr>)}</tbody>
                    </table>
                  )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
