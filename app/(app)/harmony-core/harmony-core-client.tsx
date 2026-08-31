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
