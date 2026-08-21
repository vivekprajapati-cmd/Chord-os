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
  const [showAssign, setShowAssign] = useState(false);

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
    <div style={{ width: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)' }}>Harmony Core</h1>

          {/* Person dropdown */}
          <select
            value={selectedPersonId}
            onChange={e => setSelectedPersonId(e.target.value)}
            style={{ padding: '7px 32px 7px 12px', borderRadius: '999px', border: '0.5px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name.split(' ')[0]} — {getRoleType(p)}</option>
            ))}
          </select>

          {/* Month dropdown */}
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '7px 32px 7px 12px', borderRadius: '999px', border: '0.5px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - 5 + i);
              const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              return <option key={val} value={val}>{label}</option>;
            })}
          </select>

          {me.access_tier === 'admin' && (
            <button onClick={() => setShowAssign(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', border: '1px solid var(--ink, #0D0D0B)', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
              + Assign Brand
            </button>
          )}
        </div>
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

      {showAssign && (
        <AssignModal
          people={people}
          defaultPersonId={selectedPersonId}
          onClose={() => setShowAssign(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
