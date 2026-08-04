'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const [activeTab, setActiveTab] = useState<'snapshot' | 'stages' | 'teams' | 'status' | 'priority' | 'tracker' | 'log'>('snapshot');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-brain/sheet');
      if (!res.ok) {
        const e = await res.json();
        if (e.error === 'no_sheet_url') { setError('No sheet URL set. Add one above.'); return; }
        setError(e.error ?? 'Failed to load sheet.');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (sheetUrl) fetchData(); }, [sheetUrl, fetchData]);

  async function saveUrl() {
    setSaving(true);
    await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'backlog_sheet_url', value: inputUrl.trim() }), headers: { 'Content-Type': 'application/json' } });
    setSheetUrl(inputUrl.trim());
    setSaving(false);
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
      <h1 className="font-display text-5xl uppercase tracking-tight mb-1">Admin Brain</h1>
      <p style={{ ...label, marginBottom: '24px' }}>Backlog dashboard — live from Google Sheets</p>

      {/* Sheet URL input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center' }}>
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          placeholder="Paste Google Sheet URL (must be shared: anyone with link can view)"
          style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '9px 18px', fontFamily: 'var(--f-mono)', fontSize: '11px', outline: 'none', color: 'var(--ink)' }}
        />
        <button
          onClick={saveUrl}
          disabled={saving || !inputUrl.trim()}
          style={{ ...mono, background: 'var(--ink)', color: 'var(--cream)', padding: '9px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : 'Save & Sync'}
        </button>
        {sheetUrl && (
          <button onClick={fetchData} disabled={loading} style={{ ...mono, background: 'transparent', border: '1px solid var(--line)', color: 'var(--gray)', padding: '9px 16px', borderRadius: '999px', cursor: 'pointer' }}>
            {loading ? '…' : 'Refresh'}
          </button>
        )}
      </div>

      {error && <p style={{ ...mono, color: 'var(--red)', marginBottom: '16px' }}>{error}</p>}
      {loading && <p style={label}>Loading sheet data…</p>}

      {data && (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{ ...mono, padding: '6px 14px', borderRadius: '999px', border: `1px solid ${activeTab === t.key ? 'var(--ink)' : 'var(--line)'}`, background: activeTab === t.key ? 'var(--ink)' : 'transparent', color: activeTab === t.key ? 'var(--cream)' : 'var(--gray)', cursor: 'pointer' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Snapshot */}
          {activeTab === 'snapshot' && (
            <div>
              <p style={{ ...label, marginBottom: '16px' }}>As of {data.snapshot.as_of}</p>
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

          {/* By Team */}
          {activeTab === 'teams' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                <thead><tr><Th>Team</Th><Th>Open Tasks</Th></tr></thead>
                <tbody>{data.teamBreakdown.map((r, i) => <tr key={i}><Td>{r.team}</Td><Td>{r.open}</Td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Status Breakdown */}
          {activeTab === 'status' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                <thead><tr><Th>Status</Th><Th>Count</Th></tr></thead>
                <tbody>{data.statusBreakdown.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...mono, fontSize: '11px', textTransform: 'none', padding: '8px 12px', borderBottom: '1px solid var(--line)', color: statusColor(r.status) }}>{r.status}</td>
                    <Td>{r.count}</Td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* Priority Tasks */}
          {activeTab === 'priority' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                <thead><tr><Th>#</Th><Th>Brand</Th><Th>Month</Th><Th>Remaining</Th><Th>Deadline</Th><Th>Days Left</Th><Th>Status</Th><Th>Priority</Th></tr></thead>
                <tbody>{data.priorityTasks.map((r, i) => (
                  <tr key={i}>
                    <Td>{r.rank}</Td><Td>{r.brand}</Td><Td>{r.month}</Td><Td red={parseInt(r.remaining) > 0}>{r.remaining}</Td>
                    <Td>{r.deadline}</Td>
                    <Td red={parseInt(r.days_left) <= 0}>{parseInt(r.days_left) <= 0 ? 'Overdue' : r.days_left}</Td>
                    <td style={{ ...mono, fontSize: '11px', textTransform: 'none', padding: '8px 12px', borderBottom: '1px solid var(--line)', color: statusColor(r.status) }}>{r.status}</td>
                    <Td>{r.priority}</Td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* Tracker */}
          {activeTab === 'tracker' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                <thead><tr><Th>Brand</Th><Th>Month</Th><Th>Total</Th><Th>Static</Th><Th>Pend. Shoot</Th><Th>In Progress</Th><Th>Shot-NE</Th><Th>AI/MG</Th><Th>Influencer</Th><Th>Stories</Th><Th>Done</Th><Th>Remaining</Th><Th>Deadline</Th><Th>Days Left</Th><Th>%</Th><Th>Status</Th></tr></thead>
                <tbody>{data.tracker.map((r, i) => (
                  <tr key={i}>
                    <Td>{r.brand}</Td><Td>{r.month}</Td><Td>{r.total}</Td>
                    <Td>{r.static || '-'}</Td><Td>{r.pending_shoot || '-'}</Td><Td>{r.in_progress || '-'}</Td>
                    <Td>{r.shot_ne || '-'}</Td><Td>{r.ai_mg || '-'}</Td><Td>{r.influencer || '-'}</Td><Td>{r.stories || '-'}</Td>
                    <Td>{r.completed}</Td><Td red={parseInt(r.remaining) > 0}>{r.remaining}</Td>
                    <Td>{r.deadline}</Td><Td red={parseInt(r.days_left) <= 0}>{parseInt(r.days_left) <= 0 ? 'Overdue' : r.days_left}</Td>
                    <Td>{r.pct_complete}</Td>
                    <td style={{ ...mono, fontSize: '11px', textTransform: 'none', padding: '8px 12px', borderBottom: '1px solid var(--line)', color: statusColor(r.status) }}>{r.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* Daily Log */}
          {activeTab === 'log' && (
            <div style={{ overflowX: 'auto' }}>
              {data.dailyLog.length === 0
                ? <p style={label}>No daily log entries yet.</p>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '14px', overflow: 'hidden' }}>
                    <thead><tr><Th>Date</Th><Th>Brand : Month</Th><Th>Qty Completed</Th><Th>Note</Th></tr></thead>
                    <tbody>{data.dailyLog.map((r, i) => <tr key={i}><Td>{r.date}</Td><Td>{r.brand_month}</Td><Td>{r.qty}</Td><Td>{r.note || '-'}</Td></tr>)}</tbody>
                  </table>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
