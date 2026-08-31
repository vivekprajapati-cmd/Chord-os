'use client';

import { useEffect, useState, useCallback } from 'react';
import SocialTable from './tables/social-table';
import InfluencerTable from './tables/influencer-table';
import CreativeTable from './tables/creative-table';
import AssignModal from './assign-modal';

type Person = { id: string; name: string; role: string; access_tier: string };

type Props = {
  me: { id: string; name: string; access_tier: string; role: string };
  people: Person[];
};

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function toMonthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function toWeekParam(date: Date) {
  const m = getMonday(new Date(date));
  return m.toISOString().split('T')[0];
}

function getRoleTypeById(people: Person[], id: string): 'social' | 'influencer' | 'creative' {
  const p = people.find(x => x.id === id);
  return p ? getRoleType(p) : 'social';
}

function getRoleType(person: Person): 'social' | 'influencer' | 'creative' {
  const name = person.name.toLowerCase();
  if (name.includes('arbaaz')) return 'influencer';
  if (name.includes('pierre')) return 'creative';
  return 'social';
}

function getRoleBadgeStyle(role: 'social' | 'influencer' | 'creative') {
  if (role === 'influencer') return { background: 'var(--bg-success)', color: 'var(--text-success)' };
  if (role === 'creative') return { background: 'var(--bg-pro)', color: 'var(--text-pro)' };
  return { background: 'var(--bg-accent)', color: 'var(--text-accent)' };
}

type LineConfig = { key: string; label: string; color: string };

function LineChart({ title, data, lines }: { title: string; data: any[]; lines: LineConfig[] }) {
  const W = 440, H = 140, padL = 8, padR = 8, padT = 12, padB = 28;
  const iW = W - padL - padR;
  const iH = H - padT - padB;
  const n = data.length;
  if (n < 1) return null;

  const allVals = data.flatMap(d => lines.map(l => Number(d[l.key]) || 0));
  const maxVal = Math.max(...allVals, 1);

  function x(i: number) { return padL + (i / (n - 1)) * iW; }
  function y(v: number) { return padT + iH - (v / maxVal) * iH; }
  function polyline(key: string) {
    return data.map((d, i) => `${x(i)},${y(Number(d[key]) || 0)}`).join(' ');
  }

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid #c8c4bc', borderRadius: '10px', padding: '14px 16px', boxShadow: '3px 3px 0 var(--ink)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '8px' }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={padL} x2={W - padR} y1={padT + iH * (1 - f)} y2={padT + iH * (1 - f)}
            stroke="#e5e2da" strokeWidth="1" />
        ))}
        {/* Lines */}
        {n > 1 && lines.map(l => (
          <polyline key={l.key} points={polyline(l.key)} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {/* Dots at current month */}
        {lines.map(l => {
          const last = n - 1;
          return <circle key={l.key} cx={x(last)} cy={y(Number(data[last][l.key]) || 0)} r="3.5" fill={l.color} />;
        })}
        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="#999">{d.label}</text>
        ))}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '4px' }}>
        {lines.map(l => (
          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: '16px', height: '2px', background: l.color, borderRadius: '1px' }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HarmonyCoreClient({ me, people }: Props) {
  const now = new Date();
  const isTracked = people.some(p => p.id === me.id);
  const [selectedPersonId, setSelectedPersonId] = useState(isTracked ? me.id : (people[0]?.id ?? me.id));
  const [month, setMonth] = useState(toMonthParam(now));
  const [weekStart, setWeekStart] = useState(toWeekParam(now));
  const [assignments, setAssignments] = useState<any[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<any[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [carriedBrands, setCarriedBrands] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const selectedPerson = people.find(p => p.id === selectedPersonId) ?? people[0];
  const roleType = selectedPerson ? getRoleType(selectedPerson) : 'social';
  const canEdit = me.access_tier === 'admin' || me.id === selectedPersonId;

  const load = useCallback(async (silent = false, personIdOverride?: string) => {
    const pid = personIdOverride ?? selectedPersonId;
    if (!pid) return;
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [monthly, weekly] = await Promise.all([
        fetch(`/api/harmony-core?person_id=${pid}&month=${month}`, { cache: 'no-store' }).then(r => r.json()),
        roleType === 'social'
          ? fetch(`/api/harmony-core/weekly?person_id=${pid}&week_start=${weekStart}`, { cache: 'no-store' }).then(r => r.json())
          : Promise.resolve({ entries: [] }),
      ]);
      setAssignments(monthly.assignments ?? []);
      setMonthlyEntries(monthly.entries ?? []);
      setWeeklyEntries(weekly.entries ?? []);
      setCarriedBrands(monthly.carried_brands ?? []);
      // Fetch history in parallel (social only) — don't await, fires and forgets into state
      if ((personIdOverride ? getRoleTypeById(people, personIdOverride) : roleType) === 'social') {
        fetch(`/api/harmony-core/history?person_id=${pid}`, { cache: 'no-store' })
          .then(r => r.json()).then(d => setHistory(d.history ?? [])).catch(() => {});
      }
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, [selectedPersonId, month, weekStart, roleType]);

  useEffect(() => { load(false); }, [load]);

  const lastUpdated = monthlyEntries.length > 0
    ? new Date(Math.max(...monthlyEntries.map((e: any) => new Date(e.updated_at).getTime())))
    : null;

  function formatRelative(d: Date) {
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const monthLabel = new Date(month + 'T00:00:00').toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const hasHistory = roleType === 'social' && history.length > 0 && history.some(h => h.scope > 0 || h.backlog > 0);

  // Month navigation
  function changeMonth(dir: 1 | -1) {
    const d = new Date(month + 'T00:00:00');
    d.setMonth(d.getMonth() + dir);
    setMonth(toMonthParam(d));
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Top bar: title + month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Harmony Core
          </h1>
          <button onClick={() => setShowAssign(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 13px', borderRadius: '999px', border: '1.5px solid var(--ink, #0D0D0B)', background: 'transparent', color: 'var(--ink, #0D0D0B)', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', fontWeight: 700, transition: 'all .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink, #0D0D0B)'; (e.currentTarget as HTMLButtonElement).style.color = '#F0EDE5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink, #0D0D0B)'; }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> Assign Brand
            </button>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0px', border: '1.5px solid var(--border, #c8c4bc)', borderRadius: '10px', overflow: 'hidden' }}>
          <button onClick={() => changeMonth(-1)} style={{ padding: '7px 12px', background: 'none', border: 'none', borderRight: '1px solid var(--border, #c8c4bc)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', padding: '7px 14px', minWidth: '118px', textAlign: 'center', letterSpacing: '0.02em' }}>{monthLabel}</span>
          <button onClick={() => changeMonth(1)} style={{ padding: '7px 12px', background: 'none', border: 'none', borderLeft: '1px solid var(--border, #c8c4bc)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>›</button>
        </div>
      </div>

      {/* Person tab bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {people.map(p => {
          const role = getRoleType(p);
          const active = p.id === selectedPersonId;
          const roleColors: Record<string, { bg: string; text: string }> = {
            social:     { bg: '#dbeafe', text: '#1d4ed8' },
            influencer: { bg: '#dcfce7', text: '#15803d' },
            creative:   { bg: '#f3e8ff', text: '#7c3aed' },
          };
          const rc = roleColors[role] ?? roleColors.social;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPersonId(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
                padding: '8px 16px 8px 14px', borderRadius: '10px',
                border: active ? '1.5px solid var(--ink, #0D0D0B)' : '1.5px solid var(--border, #c8c4bc)',
                background: active ? 'var(--ink, #0D0D0B)' : 'var(--surface-1, #fff)',
                color: active ? '#F0EDE5' : 'var(--text-primary)',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {p.name.split(' ')[0]}
              </span>
              <span style={{
                fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '2px 7px', borderRadius: '999px',
                background: active ? 'rgba(255,255,255,0.15)' : rc.bg,
                color: active ? '#F0EDE5' : rc.text,
              }}>
                {role}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section subheader */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {selectedPerson?.name.split(' ')[0] ?? ''}&rsquo;s brands
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5' }}>
            {assignments.length} active
          </span>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ↻ {formatRelative(lastUpdated)}
            </span>
          )}
        </div>
        {!canEdit && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>View only</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
      ) : assignments.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No brands assigned yet.</div>
      ) : roleType === 'social' ? (
        <SocialTable
          assignments={assignments}
          monthlyEntries={monthlyEntries}
          weeklyEntries={weeklyEntries}
          weekStart={weekStart}
          month={month}
          personId={selectedPersonId}
          canEdit={canEdit}
          onSaved={() => load(true)}
        />
      ) : roleType === 'influencer' ? (
        <InfluencerTable
          assignments={assignments}
          entries={monthlyEntries}
          month={month}
          personId={selectedPersonId}
          canEdit={canEdit}
          onSaved={() => load(true)}
        />
      ) : (
        <CreativeTable
          assignments={assignments}
          entries={monthlyEntries}
          month={month}
          personId={selectedPersonId}
          canEdit={canEdit}
          onSaved={() => load(true)}
        />
      )}

      {/* Info strip */}
      <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'var(--surface-1)', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {canEdit
          ? `You are viewing ${selectedPerson?.name.split(' ')[0] ?? ''}${String.fromCharCode(39)}s data. Click the edit icon on any row to update.`
          : `You are viewing ${selectedPerson?.name.split(' ')[0] ?? ''}${String.fromCharCode(39)}s data. You can only edit your own brands.`}
      </div>

      {/* Dashboard — social trend charts */}
      {hasHistory && (
        <div style={{ marginTop: '28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {selectedPerson?.name.split(' ')[0]}&rsquo;s Trends
          </div>

          {/* Carry-over notice */}
          {carriedBrands.length > 0 && (() => {
            const prevMonthDate = new Date(month + 'T00:00:00');
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
            const prevLabel = prevMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const names = carriedBrands.map(id => assignments.find((a: any) => a.brand_id === id)?.brands?.name ?? id);
            return (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fefce8', border: '1.5px solid #ca8a04', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', lineHeight: 1.2 }}>↩</span>
                <span>
                  <strong>Backlog auto-carried from {prevLabel}:</strong> {names.join(', ')} — remaining scope added to {monthLabel} backlog.
                </span>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <LineChart title="Scope vs Completion" data={history}
              lines={[
                { key: 'scope', label: 'Scope', color: '#6366f1' },
                { key: 'done', label: 'Completed', color: '#16a34a' },
              ]} />
            <LineChart title="Backlog vs Cleared" data={history}
              lines={[
                { key: 'backlog', label: 'Backlog', color: '#d97706' },
                { key: 'backlog_done', label: 'Cleared', color: '#16a34a' },
              ]} />
          </div>
        </div>
      )}

      {showAssign && (
        <AssignModal
          people={people}
          defaultPersonId={selectedPersonId}
          onClose={() => setShowAssign(false)}
          onSaved={(personId) => {
            setSelectedPersonId(personId);
            load(true, personId);
          }}
        />
      )}
    </div>
  );
}
