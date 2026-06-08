'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type BlockInfo = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  tasks: { deliverable: string; estimated_hours: number | null; brands: { name: string } | null } | null;
};

type MemberStat = {
  person_id: string;
  name: string;
  department: string;
  total_tasks: number;
  completed_tasks: number;
  on_time_count: number;
  late_count: number;
  total_delays: number;
  on_time_rate: number | null;
  avg_turnaround_hours: number | null;
  active_tasks: number;
};

type Brand = { id: string; name: string; slug: string };

type BrandTask = {
  brand_id: string;
  estimated_hours: number | null;
  status: string;
  owner_id: string;
  brands: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
};

type Props = {
  members: MemberStat[];
  isLead: boolean;
  canSeeAll: boolean;
  totalTasks: number;
  totalCompleted: number;
  totalDelays: number;
  teamOnTimeRate: number | null;
  month: string;
  brands: Brand[];
  brandTasks: BrandTask[];
};

export default function AnalyticsClient({
  members, isLead, canSeeAll, totalTasks, totalCompleted, totalDelays, teamOnTimeRate, month, brands, brandTasks
}: Props) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [personBlocks, setPersonBlocks] = useState<Record<string, BlockInfo[]>>({});
  const [loadingBlocks, setLoadingBlocks] = useState<string | null>(null);

  const togglePerson = useCallback(async (personId: string) => {
    if (expandedPersonId === personId) { setExpandedPersonId(null); return; }
    setExpandedPersonId(personId);
    if (personBlocks[personId]) return; // already fetched
    setLoadingBlocks(personId);
    const { data } = await supabase
      .from('blocks')
      .select('id, start_at, end_at, status, tasks(deliverable, estimated_hours, brands(name))')
      .eq('person_id', personId)
      .not('status', 'in', '("done","cancelled")')
      .order('start_at', { ascending: true });
    setPersonBlocks(prev => ({ ...prev, [personId]: (data ?? []) as unknown as BlockInfo[] }));
    setLoadingBlocks(null);
  }, [expandedPersonId, personBlocks, supabase]);

  function renderBlocks(personId: string) {
    if (loadingBlocks === personId) {
      return <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>Loading…</p>;
    }
    const blocks = personBlocks[personId] ?? [];
    if (blocks.length === 0) {
      return <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No active blocks.</p>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.map(b => {
          const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
          const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '10px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500 }}>{b.tasks?.deliverable ?? 'Unnamed task'}</p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>
                  {b.tasks?.brands?.name ?? ''}{b.tasks?.brands?.name ? ' · ' : ''}{fmtDate(b.start_at)}, {fmtTime(b.start_at)} – {fmtTime(b.end_at)}{b.tasks?.estimated_hours ? ` · ${b.tasks.estimated_hours}h` : ''}
                </p>
              </div>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '2px 8px', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                {b.status}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  async function exportExcel() {
    const xlsx = await import('xlsx');
    const summaryData = [
      ['Harmony Monthly Report', month],
      [],
      ['Metric', 'Value'],
      ['Total Tasks', totalTasks],
      ['Completed', totalCompleted],
      ['Total Delays', totalDelays],
      ['Team On-time Rate', teamOnTimeRate !== null ? `${teamOnTimeRate}%` : '—'],
    ];
    const memberHeaders = ['Name', 'Department', 'Active', 'Total Tasks', 'Completed', 'On-time', 'Late', 'Delays', 'On-time Rate', 'Avg Turnaround (hrs)'];
    const memberData = [
      memberHeaders,
      ...members.map(m => [m.name, m.department, m.active_tasks ?? 0, m.total_tasks ?? 0, m.completed_tasks ?? 0, m.on_time_count ?? 0, m.late_count ?? 0, m.total_delays ?? 0, m.on_time_rate !== null ? `${m.on_time_rate}%` : '—', m.avg_turnaround_hours !== null ? m.avg_turnaround_hours : '—']),
    ];
    const wb = xlsx.utils.book_new();
    const wsSummary = xlsx.utils.aoa_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary');
    const wsMembers = xlsx.utils.aoa_to_sheet(memberData);
    wsMembers['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 20 }];
    xlsx.utils.book_append_sheet(wb, wsMembers, 'Member Breakdown');
    xlsx.writeFile(wb, `Harmony_Report_${month.replace(' ', '_')}.xlsx`);
  }

  // Brand filter stats
  const brandStats = useMemo(() => {
    if (!selectedBrandId) return null;
    const filtered = brandTasks.filter(t => t.brand_id === selectedBrandId);
    const totalHours = filtered.reduce((acc, t) => acc + (t.estimated_hours ?? 0), 0);
    const completedHours = filtered.filter(t => ['approved', 'done'].includes(t.status)).reduce((acc, t) => acc + (t.estimated_hours ?? 0), 0);

    // Per-person breakdown
    const byPerson: Record<string, { name: string; tasks: number; hours: number }> = {};
    filtered.forEach(t => {
      const pid = t.owner_id;
      const name = t.owner?.name ?? 'Unknown';
      if (!byPerson[pid]) byPerson[pid] = { name, tasks: 0, hours: 0 };
      byPerson[pid].tasks += 1;
      byPerson[pid].hours += t.estimated_hours ?? 0;
    });

    return {
      totalTasks: filtered.length,
      totalHours: Math.round(totalHours * 10) / 10,
      completedHours: Math.round(completedHours * 10) / 10,
      people: Object.values(byPerson).sort((a, b) => b.hours - a.hours),
    };
  }, [selectedBrandId, brandTasks]);

  const selectedBrandName = brands.find(b => b.id === selectedBrandId)?.name ?? '';

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #analytics-print, #analytics-print * { visibility: visible; }
          #analytics-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div ref={printRef} id="analytics-print" className="space-y-10">

        {/* Header */}
        <div className="flex items-end justify-between no-print">
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>
              {canSeeAll ? 'Team Performance' : 'My Performance'}
            </p>
            <h1 className="font-display text-5xl uppercase tracking-tight">Analytics</h1>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '6px' }}>{month}</p>
          </div>
          {canSeeAll && (
            <div className="flex gap-2 no-print">
              <button onClick={exportExcel} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)' }}>
                ↓ Export Excel
              </button>
              <button onClick={() => window.print()} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer' }}>
                ↓ Export PDF
              </button>
            </div>
          )}
        </div>

        {/* Print header */}
        <div style={{ display: 'none' }} className="print-only">
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '4px' }}>Harmony Monthly Report</h1>
          <p style={{ fontSize: '13px', color: '#666' }}>{month}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Tasks', value: String(totalTasks) },
            { label: 'Completed', value: String(totalCompleted) },
            { label: 'Total Delays', value: String(totalDelays), alert: totalDelays > 5 },
            { label: 'On-time Rate', value: teamOnTimeRate !== null ? `${teamOnTimeRate}%` : '—' },
          ].map(({ label, value, alert }) => (
            <div key={label} style={{ background: alert ? 'var(--coral)' : 'var(--paper)', border: `1.5px solid ${alert ? 'var(--ink)' : 'var(--line)'}`, borderRadius: '14px', padding: '20px', boxShadow: '5px 5px 0 var(--coral)' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: alert ? 'rgba(255,255,255,0.7)' : 'var(--gray)', marginBottom: '8px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--f-display)', fontSize: '40px', fontWeight: 400, textTransform: 'uppercase', lineHeight: 1, color: alert ? '#fff' : 'var(--ink)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Brand filter — all leads/admins/viewers */}
        {isLead && brands.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)' }}>Brand breakdown</p>
              <select
                value={selectedBrandId}
                onChange={e => setSelectedBrandId(e.target.value)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '6px 14px', outline: 'none', color: 'var(--ink)', cursor: 'pointer' }}
              >
                <option value=''>Select brand…</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {brandStats && (
              <div className="space-y-4">
                {/* Brand summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total tasks', value: String(brandStats.totalTasks) },
                    { label: 'Total hours', value: `${brandStats.totalHours}h` },
                    { label: 'Completed hrs', value: `${brandStats.completedHours}h` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '18px', boxShadow: '4px 4px 0 var(--coral)' }}>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: '8px' }}>{selectedBrandName} · {label}</p>
                      <p style={{ fontFamily: 'var(--f-display)', fontSize: '32px', textTransform: 'uppercase', lineHeight: 1 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Per-person breakdown for brand */}
                {brandStats.people.length > 0 && (
                  <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 80px', padding: '10px 20px', background: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>
                      {['Person', 'Tasks', 'Hours'].map(h => (
                        <p key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream)' }}>{h}</p>
                      ))}
                    </div>
                    {brandStats.people.map((p, i) => {
                      const personId = Object.keys(
                        brandTasks.filter(t => t.owner?.name === p.name).reduce((acc: any, t) => { acc[t.owner_id] = true; return acc; }, {})
                      )[0] ?? '';
                      return (
                        <div key={p.name} style={{ borderBottom: i < brandStats.people.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <div
                            style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 80px', padding: '12px 20px', cursor: personId ? 'pointer' : 'default' }}
                            onClick={() => personId && togglePerson(personId)}
                          >
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>
                              {p.name} {personId && (expandedPersonId === personId ? '▲' : '▼')}
                            </p>
                            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px' }}>{p.tasks}</p>
                            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--cobalt)' }}>{p.hours}h</p>
                          </div>
                          {personId && expandedPersonId === personId && (
                            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
                              {renderBlocks(personId)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Per-member table — leads/admins only */}
        {canSeeAll && (
          <section>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '12px' }}>Per-member breakdown</p>
            <div className="table-scroll" style={{ borderRadius: '14px', border: '1px solid var(--line)' }}>
              <div style={{ background: 'var(--paper)', minWidth: '680px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 70px 70px 80px 70px 80px', padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--ink)' }}>
                  {['Name', 'Dept', 'Active', 'Total', 'Done', 'On-time', 'Delays', 'Avg hrs'].map(h => (
                    <p key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream)' }}>{h}</p>
                  ))}
                </div>
                {members.map((m, i) => (
                  <div key={m.person_id} style={{ borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 70px 70px 80px 70px 80px', padding: '12px 20px', background: (m.total_delays ?? 0) >= 3 ? 'rgba(255,59,47,0.04)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => togglePerson(m.person_id)}
                    >
                      <p style={{ fontSize: '13px', fontWeight: 500 }}>{m.name} {expandedPersonId === m.person_id ? '▲' : '▼'}</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>{m.department}</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--cobalt)' }}>{m.active_tasks ?? 0}</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px' }}>{m.total_tasks ?? 0}</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>{m.completed_tasks ?? 0}</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: (m.on_time_rate ?? 100) < 70 ? 'var(--red)' : 'inherit' }}>
                        {m.on_time_rate !== null ? `${m.on_time_rate}%` : '—'}
                      </p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: (m.total_delays ?? 0) >= 3 ? 'var(--red)' : 'inherit', fontWeight: (m.total_delays ?? 0) >= 3 ? 600 : 400 }}>
                        {m.total_delays ?? 0}
                      </p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>
                        {m.avg_turnaround_hours !== null ? `${m.avg_turnaround_hours}h` : '—'}
                      </p>
                    </div>
                    {expandedPersonId === m.person_id && (
                      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
                        {renderBlocks(m.person_id)}
                      </div>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--gray)', fontFamily: 'var(--f-mono)', fontSize: '12px' }}>No task data yet.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Staff/individual personal breakdown */}
        {!canSeeAll && members[0] && (
          <section>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '12px' }}>Your breakdown</p>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
              {[
                { label: 'Active tasks', value: String(members[0].active_tasks ?? 0) },
                { label: 'Completed', value: String(members[0].completed_tasks ?? 0) },
                { label: 'On-time', value: String(members[0].on_time_count ?? 0) },
                { label: 'Late', value: String(members[0].late_count ?? 0) },
                { label: 'Delays', value: String(members[0].total_delays ?? 0) },
                { label: 'On-time rate', value: members[0].on_time_rate !== null ? `${members[0].on_time_rate}%` : '—' },
                { label: 'Avg turnaround', value: members[0].avg_turnaround_hours !== null ? `${members[0].avg_turnaround_hours}h` : '—' },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--f-display)', fontSize: '22px', textTransform: 'uppercase' }}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
