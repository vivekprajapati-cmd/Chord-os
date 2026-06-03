'use client';

const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

async function exportExcel(stats: typeof MOCK_STATS, totalTasks: number, totalDone: number, totalDelays: number, teamRate: number) {
  const xlsx = await import('xlsx');
  const summaryData = [
    ['Harmony Monthly Report', month],
    [],
    ['Metric', 'Value'],
    ['Total Tasks', totalTasks],
    ['Completed', totalDone],
    ['Total Delays', totalDelays],
    ['Team On-time Rate', `${teamRate}%`],
  ];
  const memberData = [
    ['Name', 'Department', 'Active', 'Total', 'Done', 'On-time Rate', 'Delays', 'Avg Turnaround (hrs)'],
    ...stats.map(m => [m.name, m.department, m.active, m.total, m.done, `${m.on_time_rate}%`, m.delays, `${m.avg_hrs}h`]),
  ];
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(summaryData), 'Summary');
  const ws = xlsx.utils.aoa_to_sheet(memberData);
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
  xlsx.utils.book_append_sheet(wb, ws, 'Member Breakdown');
  xlsx.writeFile(wb, `Harmony_Report_${month.replace(' ', '_')}.xlsx`);
}

const MOCK_STATS = [
  { name: 'Darshit Raut',       department: 'Ops',        active: 2, total: 8,  done: 7,  on_time: 7,  delays: 0, on_time_rate: 100, avg_hrs: 3.2 },
  { name: 'Shivangi Shekhar',   department: 'Leadership', active: 1, total: 12, done: 11, on_time: 11, delays: 0, on_time_rate: 100, avg_hrs: 5.1 },
  { name: 'Trupti Maidh',       department: 'Account',    active: 3, total: 20, done: 17, on_time: 16, delays: 1, on_time_rate: 94,  avg_hrs: 4.8 },
  { name: 'Pierre Santos',      department: 'Creative',   active: 2, total: 15, done: 13, on_time: 12, delays: 1, on_time_rate: 92,  avg_hrs: 6.0 },
  { name: 'Pratik Kshirsagar',  department: 'Creative',   active: 3, total: 18, done: 15, on_time: 14, delays: 1, on_time_rate: 93,  avg_hrs: 5.5 },
  { name: 'Manan Shah',         department: 'Creative',   active: 2, total: 22, done: 19, on_time: 16, delays: 3, on_time_rate: 84,  avg_hrs: 2.8 },
  { name: 'Kuldip Mankar',      department: 'Creative',   active: 1, total: 10, done: 9,  on_time: 9,  delays: 0, on_time_rate: 100, avg_hrs: 4.1 },
  { name: 'Yashika Mistry',     department: 'Creative',   active: 2, total: 14, done: 11, on_time: 9,  delays: 2, on_time_rate: 82,  avg_hrs: 3.6 },
  { name: 'Nimesh Shinde',      department: 'Video',      active: 2, total: 16, done: 14, on_time: 13, delays: 1, on_time_rate: 93,  avg_hrs: 5.9 },
  { name: 'Vineet Shelar',      department: 'Video',      active: 3, total: 24, done: 20, on_time: 17, delays: 3, on_time_rate: 85,  avg_hrs: 4.5 },
  { name: 'Tarun',              department: 'Video',      active: 2, total: 19, done: 16, on_time: 15, delays: 1, on_time_rate: 94,  avg_hrs: 4.2 },
  { name: 'Aman Adodra',        department: 'SEO',        active: 2, total: 11, done: 10, on_time: 10, delays: 0, on_time_rate: 100, avg_hrs: 6.5 },
  { name: 'Dhwani Chhelavda',   department: 'Content',    active: 2, total: 17, done: 14, on_time: 12, delays: 2, on_time_rate: 86,  avg_hrs: 3.0 },
  { name: 'Muskaan Madnani',    department: 'Sales',      active: 1, total: 9,  done: 8,  on_time: 8,  delays: 0, on_time_rate: 100, avg_hrs: 2.5 },
  { name: 'Moksha Mehta',       department: 'Sales',      active: 1, total: 8,  done: 7,  on_time: 7,  delays: 0, on_time_rate: 100, avg_hrs: 2.4 },
  { name: 'Shivani Reshamwala', department: 'Sales',      active: 1, total: 7,  done: 6,  on_time: 6,  delays: 0, on_time_rate: 100, avg_hrs: 2.6 },
  { name: 'Rajat Dey',          department: 'Marketing',  active: 2, total: 13, done: 11, on_time: 10, delays: 1, on_time_rate: 91,  avg_hrs: 3.8 },
  { name: 'Shawn Dsouza',       department: 'Marketing',  active: 1, total: 6,  done: 5,  on_time: 4,  delays: 1, on_time_rate: 80,  avg_hrs: 2.1 },
  { name: 'Shanvi Patel',       department: 'Marketing',  active: 1, total: 5,  done: 4,  on_time: 4,  delays: 0, on_time_rate: 100, avg_hrs: 2.0 },
  { name: 'Yassha Gada',        department: 'Marketing',  active: 1, total: 5,  done: 4,  on_time: 4,  delays: 0, on_time_rate: 100, avg_hrs: 2.0 },
];

export default function DemoAnalyticsPage() {
  const totalTasks = MOCK_STATS.reduce((a, m) => a + m.total, 0);
  const totalDone = MOCK_STATS.reduce((a, m) => a + m.done, 0);
  const totalDelays = MOCK_STATS.reduce((a, m) => a + m.delays, 0);
  const teamOnTimeRate = Math.round(MOCK_STATS.reduce((a, m) => a + m.on_time_rate, 0) / MOCK_STATS.length);

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>Team Performance</p>
          <h1 className="font-display text-5xl uppercase tracking-tight">Analytics</h1>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--cobalt)', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo — {month}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportExcel(MOCK_STATS, totalTasks, totalDone, totalDelays, teamOnTimeRate)}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)' }}
          >
            ↓ Export Excel
          </button>
          <button
            onClick={() => window.print()}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer' }}
          >
            ↓ Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: String(totalTasks) },
          { label: 'Completed', value: String(totalDone) },
          { label: 'Total Delays', value: String(totalDelays), alert: true },
          { label: 'On-time Rate', value: `${teamOnTimeRate}%` },
        ].map(({ label, value, alert }) => (
          <div key={label} style={{ background: alert ? 'var(--coral)' : 'var(--paper)', border: `1.5px solid ${alert ? 'var(--ink)' : 'var(--line)'}`, borderRadius: '14px', padding: '20px', boxShadow: '5px 5px 0 var(--ink)' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--f-display)', fontSize: '40px', fontWeight: 400, textTransform: 'uppercase', lineHeight: 1, color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-member table */}
      <section>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '12px' }}>Per-member breakdown</p>
        <div className="table-scroll" style={{ borderRadius: '14px', border: '1px solid var(--line)' }}>
        <div style={{ background: 'var(--paper)', minWidth: '680px', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 70px 70px 70px 80px 70px 80px', padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--ink)' }}>
            {['Name', 'Dept', 'Active', 'Total', 'Done', 'On-time', 'Delays', 'Avg hrs'].map(h => (
              <p key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream)' }}>{h}</p>
            ))}
          </div>

          {MOCK_STATS.map((m, i) => (
            <div
              key={m.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 70px 70px 70px 80px 70px 80px',
                padding: '12px 20px',
                borderBottom: i < MOCK_STATS.length - 1 ? '1px solid var(--line)' : 'none',
                background: m.delays >= 3 ? 'rgba(255,59,47,0.04)' : 'transparent',
              }}
            >
              <p style={{ fontSize: '13px', fontWeight: 500 }}>{m.name}</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>{m.department}</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--cobalt)' }}>{m.active}</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px' }}>{m.total}</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>{m.done}</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: m.on_time_rate < 85 ? 'var(--red)' : 'inherit' }}>{m.on_time_rate}%</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: m.delays >= 3 ? 'var(--red)' : 'inherit', fontWeight: m.delays >= 3 ? 600 : 400 }}>{m.delays}</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>{m.avg_hrs}h</p>
            </div>
          ))}
        </div>
        </div>
      </section>
    </div>
  );
}
