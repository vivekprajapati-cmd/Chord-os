'use client';

import { useState } from 'react';
import HRTabs from '../hr-tabs';

type Leave = {
  id: string; type: string; start_date: string; end_date: string; duration_days: number;
  reason: string | null; status: string; created_at: string; person_id: string;
  people: { name: string; role: string | null } | null;
  approver: { name: string } | null;
};
type Person = { id: string; name: string };
type BalanceMap = Record<string, { planned_total: number; urgent_total: number; birthday_total: number }>;
type UsedMap = Record<string, Record<string, number>>;

const TYPE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  planned:  { bg: '#ECFDF5', color: '#16a34a', border: '#16a34a30' },
  urgent:   { bg: '#FFF0EE', color: '#E55D4A', border: '#E55D4A30' },
  birthday: { bg: '#F3EFFE', color: '#7C3AED', border: '#7C3AED30' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  pending:  { bg: '#FFF8E6', color: '#B45309', border: '#F59E0B40' },
  approved: { bg: '#ECFDF5', color: '#16a34a', border: '#16a34a30' },
  rejected: { bg: '#FFF0EE', color: '#E55D4A', border: '#E55D4A30' },
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string; border: string } }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '3px 10px', fontWeight: 600, background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      {label}
    </span>
  );
}

export default function HRLeavesClient({ leaves, allPeople, balanceMap, usedMap, stats }: {
  leaves: Leave[];
  allPeople: Person[];
  balanceMap: BalanceMap;
  usedMap: UsedMap;
  stats: { pending: number; approvedThisMonth: number; rejected: number };
}) {
  const [filterPerson, setFilterPerson] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [localLeaves] = useState<Leave[]>(leaves);
  const [localStats] = useState(stats);

  const filtered = localLeaves.filter(l => {
    if (filterPerson && l.person_id !== filterPerson) return false;
    if (filterType && l.type !== filterType) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--line)', borderRadius: '8px', padding: '7px 10px',
    fontFamily: 'var(--f-mono)', fontSize: '12px', background: 'white', color: 'var(--ink)', cursor: 'pointer',
  };

  const mono11: React.CSSProperties = { fontFamily: 'var(--f-mono)', fontSize: '11px' };

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '60px' }}>
      <HRTabs />
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Pending Requests', value: localStats.pending, color: '#B45309', sub: 'Awaiting approval' },
          { label: 'Approved This Month', value: localStats.approvedThisMonth, color: '#16a34a', sub: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }) },
          { label: 'Rejected', value: localStats.rejected, color: '#E55D4A', sub: 'This month' },
        ].map(s => (
          <div key={s.label} style={{ border: '1.5px solid var(--ink)', borderRadius: '12px', boxShadow: '3px 3px 0 var(--ink)', padding: '16px 18px', background: 'var(--cream)' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '8px' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '28px', fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '4px' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} style={{ ...selectStyle, width: '180px' }}>
          <option value="">All Employees</option>
          {allPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...selectStyle, width: '160px' }}>
          <option value="">All Leave Types</option>
          <option value="planned">Planned</option>
          <option value="urgent">Urgent</option>
          <option value="birthday">Birthday</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: '140px' }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {(filterPerson || filterType || filterStatus) && (
          <button onClick={() => { setFilterPerson(''); setFilterType(''); setFilterStatus(''); }} style={{ ...selectStyle, background: 'none', cursor: 'pointer', fontSize: '10px', color: 'var(--gray)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Leave Requests Table */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Leave Requests</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>({filtered.length})</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Employee', 'Leave Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Approver'].map(h => (
                  <th key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No leave requests match the filters</td></tr>
              ) : filtered.map((l, i) => {
                const ts = TYPE_STYLE[l.type] ?? TYPE_STYLE.planned;
                const ss = STATUS_STYLE[l.status] ?? STATUS_STYLE.pending;
                const isLast = i === filtered.length - 1;
                const border = isLast ? 'none' : '1px solid var(--line)';
                const tdStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: border };
                return (
                  <tr key={l.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '8px', fontWeight: 600, flexShrink: 0 }}>
                          {initials(l.people?.name ?? '?')}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{l.people?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}><Badge label={l.type.charAt(0).toUpperCase() + l.type.slice(1)} style={ts} /></td>
                    <td style={{ ...tdStyle, ...mono11, color: 'var(--gray)', whiteSpace: 'nowrap' }}>{fmtDate(l.start_date)}</td>
                    <td style={{ ...tdStyle, ...mono11, color: 'var(--gray)', whiteSpace: 'nowrap' }}>{fmtDate(l.end_date)}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700 }}>{l.duration_days ?? 1}</td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: 'var(--gray)', maxWidth: '160px' }}>{l.reason ?? '—'}</td>
                    <td style={tdStyle}><Badge label={l.status.charAt(0).toUpperCase() + l.status.slice(1)} style={ss} /></td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                      {l.approver?.name ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Leave Balance Overview */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Team Leave Balance Overview</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>FY {new Date().getFullYear()}–{String(new Date().getFullYear() + 1).slice(2)}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Employee', 'Planned (Used / Total)', 'Urgent (Used / Total)', 'Birthday (Used / Total)'].map(h => (
                  <th key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPeople.map((p, i) => {
                const bal = balanceMap[p.id] ?? { planned_total: 12, urgent_total: 8, birthday_total: 1 };
                const used = usedMap[p.id] ?? {};
                const isLast = i === allPeople.length - 1;
                const tdStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: isLast ? 'none' : '1px solid var(--line)', fontFamily: 'var(--f-mono)', fontSize: '12px' };
                const cell = (usedKey: string, total: number) => {
                  const u = used[usedKey] ?? 0;
                  const over = u > total * 0.7;
                  return <td style={tdStyle}><span style={{ fontWeight: 700, color: over ? '#E55D4A' : 'var(--ink)' }}>{u}</span> / {total}</td>;
                };
                return (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '8px', fontWeight: 600, flexShrink: 0 }}>
                          {initials(p.name)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</span>
                      </div>
                    </td>
                    {cell('planned', bal.planned_total)}
                    {cell('urgent', bal.urgent_total)}
                    {cell('birthday', bal.birthday_total)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
