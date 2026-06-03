'use client';

import { useRef } from 'react';

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

type Props = {
  members: MemberStat[];
  isLead: boolean;
  totalTasks: number;
  totalCompleted: number;
  totalDelays: number;
  teamOnTimeRate: number | null;
  month: string;
};

export default function AnalyticsClient({ members, isLead, totalTasks, totalCompleted, totalDelays, teamOnTimeRate, month }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  async function exportExcel() {
    const xlsx = await import('xlsx');

    // Sheet 1 — summary
    const summaryData = [
      ['Harmony Monthly Report', month],
      [],
      ['Metric', 'Value'],
      ['Total Tasks', totalTasks],
      ['Completed', totalCompleted],
      ['Total Delays', totalDelays],
      ['Team On-time Rate', teamOnTimeRate !== null ? `${teamOnTimeRate}%` : '—'],
    ];

    // Sheet 2 — per-member breakdown
    const memberHeaders = ['Name', 'Department', 'Active', 'Total Tasks', 'Completed', 'On-time', 'Late', 'Delays', 'On-time Rate', 'Avg Turnaround (hrs)'];
    const memberData = [
      memberHeaders,
      ...members.map(m => [
        m.name,
        m.department,
        m.active_tasks ?? 0,
        m.total_tasks ?? 0,
        m.completed_tasks ?? 0,
        m.on_time_count ?? 0,
        m.late_count ?? 0,
        m.total_delays ?? 0,
        m.on_time_rate !== null ? `${m.on_time_rate}%` : '—',
        m.avg_turnaround_hours !== null ? m.avg_turnaround_hours : '—',
      ]),
    ];

    const wb = xlsx.utils.book_new();

    const wsSummary = xlsx.utils.aoa_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const wsMembers = xlsx.utils.aoa_to_sheet(memberData);
    // Column widths
    wsMembers['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 20 }];
    xlsx.utils.book_append_sheet(wb, wsMembers, 'Member Breakdown');

    xlsx.writeFile(wb, `Harmony_Report_${month.replace(' ', '_')}.xlsx`);
  }

  function exportPDF() {
    window.print();
  }

  return (
    <>
      {/* Print styles */}
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
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>{isLead ? 'Team Performance' : 'My Performance'}</p>
            <h1 className="font-display text-5xl uppercase tracking-tight">Analytics</h1>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '6px' }}>{month}</p>
          </div>
          {isLead && (
            <div className="flex gap-2 no-print">
              <button
                onClick={exportExcel}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)' }}
              >
                ↓ Export Excel
              </button>
              <button
                onClick={exportPDF}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer' }}
              >
                ↓ Export PDF
              </button>
            </div>
          )}
        </div>

        {/* Print header — only visible in print */}
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
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--f-display)', fontSize: '40px', fontWeight: 400, textTransform: 'uppercase', lineHeight: 1, color: 'var(--ink)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Per-member table — leads only */}
        {isLead && <section>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '12px' }}>Per-member breakdown</p>
          <div className="table-scroll" style={{ borderRadius: '14px', border: '1px solid var(--line)' }}>
          <div style={{ background: 'var(--paper)', minWidth: '680px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 70px 70px 80px 70px 80px', padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--ink)' }}>
              {['Name', 'Dept', 'Active', 'Total', 'Done', 'On-time', 'Delays', 'Avg hrs'].map(h => (
                <p key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream)' }}>{h}</p>
              ))}
            </div>

            {members.map((m, i) => (
              <div
                key={m.person_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 70px 70px 70px 80px 70px 80px',
                  padding: '12px 20px',
                  borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none',
                  background: (m.total_delays ?? 0) >= 3 ? 'rgba(255,59,47,0.04)' : 'transparent',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 500 }}>{m.name}</p>
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
            ))}

            {members.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray)', fontFamily: 'var(--f-mono)', fontSize: '12px' }}>No task data yet.</p>
              </div>
            )}
          </div>
          </div>
        </section>}

        {/* Staff personal breakdown */}
        {!isLead && members[0] && (
          <section>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '12px' }}>Your breakdown</p>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
              {[
                { label: 'Active tasks', value: String(members[0].active_tasks ?? 0) },
                { label: 'Completed', value: String(members[0].completed_tasks ?? 0) },
                { label: 'On-time', value: String(members[0].on_time_count ?? 0) },
                { label: 'Late', value: String(members[0].late_count ?? 0) },
                { label: 'Delays', value: String(members[0].total_delays ?? 0) },
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
