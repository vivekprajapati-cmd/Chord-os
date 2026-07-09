import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import ClientReviewBar from '@/components/client-review-bar';
import PortalLineChart from '@/components/portal-line-chart';
import { fetchOpenTasks, fetchMonthlySummary } from '@/lib/google-sheets';

const RAG_COLOR: Record<string, string> = {
  'on track': '#1a7a45',
  'at risk': '#e07d00',
  'overdue': 'var(--red)',
};

const STATUS_LABEL: Record<string, string> = {
  'in progress': 'In Progress',
  'closed': 'Closed',
  'on hold': 'On Hold',
  'not started': 'Not Started',
};

export default async function ClientOverviewPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount || !clientAccount.is_active) redirect('/client/login');

  const admin = createAdminClient();
  const { data: brand } = await admin
    .from('brands')
    .select('name, ops_tracker_sheet_id')
    .eq('id', clientAccount.brand_id)
    .maybeSingle();

  const sheetId = (brand as any)?.ops_tracker_sheet_id as string | null;

  // Fetch sheet data in parallel — gracefully fall back if sheet not configured
  const [openTasks, monthlySummary] = await Promise.all([
    sheetId ? fetchOpenTasks(sheetId).catch(() => []) : Promise.resolve([]),
    sheetId ? fetchMonthlySummary(sheetId).catch(() => []) : Promise.resolve([]),
  ]);

  const momChartData = monthlySummary.map(m => ({
    label: m.month.replace('-20', "'"),
    value: m.closureRate,
  }));

  // Latest closure rate for badge
  const latestMonth = [...monthlySummary].reverse().find(m => m.aligned > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Section 1 — Brand header */}
      <div>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '52px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {brand?.name ?? 'Your Brand'}
        </h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginTop: '6px' }}>
          Client Dashboard
        </p>
      </div>

      {/* Section 2 — Growth Bench (Coming Soon) */}
      <div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
          Growth Bench
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {['Reach', 'Engagement Rate', 'Page Growth'].map(metric => (
            <div key={metric} style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px',
              padding: '24px', position: 'relative', overflow: 'hidden', minHeight: '140px',
            }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '10px' }}>{metric}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px', marginBottom: '12px', opacity: 0.15 }}>
                {[40, 55, 35, 65, 50, 70].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--ink)', borderRadius: '3px 3px 0 0' }} />
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(240,237,229,0.85)' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)' }}>Coming Soon</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — MoM Closure + Sentiment Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* MoM Closure Rate */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Month on Month Closure</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '2px' }}>Task closure rate by month</p>
            </div>
            {latestMonth && (
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 600, flexShrink: 0,
                color: latestMonth.closureRate >= 80 ? '#1a7a45' : latestMonth.closureRate >= 50 ? '#e07d00' : 'var(--red)',
              }}>
                {latestMonth.closureRate}%
              </span>
            )}
          </div>
          {momChartData.length > 0 ? (
            <div style={{ padding: '12px 8px 8px' }}>
              <PortalLineChart data={momChartData} color="var(--cobalt)" unit="%" showGrid />
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No data yet.</p>
            </div>
          )}
          {monthlySummary.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
              {monthlySummary.map(m => (
                <div key={m.month} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', color: 'var(--gray)' }}>
                    {m.month.replace('-20', "'")}
                  </p>
                  <p style={{
                    fontFamily: 'var(--f-mono)', fontSize: '10px', marginTop: '2px',
                    color: m.closureRate >= 80 ? '#1a7a45' : m.closureRate >= 50 ? '#e07d00' : 'var(--red)',
                  }}>{m.closureRate}%</p>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', color: 'var(--gray)' }}>{m.closed}/{m.aligned}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sentiment Analysis — Coming Soon */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden', position: 'relative', minHeight: '220px' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sentiment Analysis</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '2px' }}>Audience & brand sentiment</p>
          </div>
          <div style={{ padding: '20px', opacity: 0.1 }}>
            {[70, 45, 80, 55, 65].map((w, i) => (
              <div key={i} style={{ height: '8px', width: `${w}%`, background: 'var(--ink)', borderRadius: '4px', marginBottom: '12px' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(240,237,229,0.85)' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)' }}>Coming Soon</p>
          </div>
        </div>

      </div>

      {/* Section 4 — Active Ops */}
      <div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
          Active Ops
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Left — Open Tasks from sheet */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Open Tasks</p>
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: '9px', padding: '3px 8px', borderRadius: '999px',
                background: 'rgba(13,13,11,0.06)', color: 'var(--gray)', border: '1px solid var(--line)',
              }}>
                {openTasks.length}
              </span>
            </div>
            {openTasks.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>
                  {sheetId ? 'No open tasks right now.' : 'Ops tracker not connected yet.'}
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {openTasks.map((task, i) => {
                  const isLast = i === openTasks.length - 1;
                  const rag = task.ragFlag.toLowerCase();
                  const ragColor = RAG_COLOR[rag] ?? 'var(--gray)';
                  return (
                    <div key={task.id} style={{
                      padding: '14px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.description}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                          {task.dueDate && (
                            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>Due {task.dueDate}</p>
                          )}
                          {task.owner && (
                            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>· {task.owner}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        {task.ragFlag && (
                          <span style={{
                            fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase',
                            letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '999px',
                            border: `1px solid ${ragColor}`, color: ragColor, whiteSpace: 'nowrap',
                          }}>
                            {task.ragFlag}
                          </span>
                        )}
                        {task.category && (
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', color: 'var(--gray)' }}>
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right — Scope Completion progress bars */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scope Completion</p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '2px' }}>Tasks closed per month</p>
              </div>
              {latestMonth && (
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 600, flexShrink: 0,
                  color: latestMonth.closureRate >= 80 ? '#1a7a45' : latestMonth.closureRate >= 50 ? '#e07d00' : 'var(--red)',
                }}>
                  {latestMonth.closureRate}%
                </span>
              )}
            </div>
            {monthlySummary.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No data yet.</p>
              </div>
            ) : (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {monthlySummary.map(m => {
                  const pct = m.closureRate;
                  const color = pct >= 80 ? '#1a7a45' : pct >= 50 ? '#e07d00' : 'var(--red)';
                  return (
                    <div key={m.month}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {m.month.replace('-20', "'")}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)' }}>
                            {m.closed}/{m.aligned}
                          </span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', fontWeight: 600, color }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: '6px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '999px',
                          width: `${pct}%`,
                          background: color,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 5 — Review bar */}
      <ClientReviewBar />

    </div>
  );
}
