'use client';

import { useEffect, useState, useCallback } from 'react';
import SocialTable from './tables/social-table';
import InfluencerTable from './tables/influencer-table';
import CreativeTable from './tables/creative-table';

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
  const [selectedPersonId, setSelectedPersonId] = useState(me.id);
  const [month, setMonth] = useState(toMonthParam(now));
  const [weekStart, setWeekStart] = useState(toWeekParam(now));
  const [assignments, setAssignments] = useState<any[]>([]);
  const [monthlyEntries, setMonthlyEntries] = useState<any[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedPerson = people.find(p => p.id === selectedPersonId) ?? people[0];
  const roleType = selectedPerson ? getRoleType(selectedPerson) : 'social';
  const canEdit = me.access_tier === 'admin' || me.id === selectedPersonId;

  const load = useCallback(async () => {
    if (!selectedPersonId) return;
    setLoading(true);
    const [monthly, weekly] = await Promise.all([
      fetch(`/api/harmony-core?person_id=${selectedPersonId}&month=${month}`).then(r => r.json()),
      roleType === 'social'
        ? fetch(`/api/harmony-core/weekly?person_id=${selectedPersonId}&week_start=${weekStart}`).then(r => r.json())
        : Promise.resolve({ entries: [] }),
    ]);
    setAssignments(monthly.assignments ?? []);
    setMonthlyEntries(monthly.entries ?? []);
    setWeeklyEntries(weekly.entries ?? []);
    setLoading(false);
  }, [selectedPersonId, month, weekStart, roleType]);

  useEffect(() => { load(); }, [load]);

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
    <div style={{ padding: '2rem', maxWidth: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)' }}>Harmony Core</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 4px', fontSize: '16px' }}>‹</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', minWidth: '120px', textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 4px', fontSize: '16px' }}>›</button>
        </div>
      </div>

      {/* Person tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {people.map(p => {
          const role = getRoleType(p);
          const active = p.id === selectedPersonId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPersonId(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 16px', borderRadius: '999px',
                border: `0.5px solid ${active ? 'var(--ink, #0D0D0B)' : 'var(--border)'}`,
                background: active ? 'var(--ink, #0D0D0B)' : 'var(--surface-1)',
                color: active ? '#F0EDE5' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {p.name.split(' ')[0]}
              <span style={{ ...getRoleBadgeStyle(role), fontSize: '10px', padding: '2px 7px', borderRadius: '999px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {role}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {selectedPerson?.name.split(' ')[0] ?? ''}&rsquo;s brands — {assignments.length} active
          </span>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Last updated: {formatRelative(lastUpdated)}
            </span>
          )}
        </div>
        {!canEdit && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>View only</span>
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
          onSaved={load}
        />
      ) : roleType === 'influencer' ? (
        <InfluencerTable
          assignments={assignments}
          entries={monthlyEntries}
          month={month}
          personId={selectedPersonId}
          canEdit={canEdit}
          onSaved={load}
        />
      ) : (
        <CreativeTable
          assignments={assignments}
          entries={monthlyEntries}
          month={month}
          personId={selectedPersonId}
          canEdit={canEdit}
          onSaved={load}
        />
      )}

      {/* Info strip */}
      <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'var(--surface-1)', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {canEdit
          ? `You are viewing ${selectedPerson?.name.split(' ')[0] ?? ''}${String.fromCharCode(39)}s data. Click the edit icon on any row to update.`
          : `You are viewing ${selectedPerson?.name.split(' ')[0] ?? ''}${String.fromCharCode(39)}s data. You can only edit your own brands.`}
      </div>
    </div>
  );
}
