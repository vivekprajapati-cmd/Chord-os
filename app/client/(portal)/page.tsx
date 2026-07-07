import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ClientReviewBar from '@/components/client-review-bar';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  ready_for_review: 'In Review',
  approved: 'Approved',
  done: 'Done',
  delayed: 'Delayed',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'var(--gray)',
  in_progress: 'var(--cobalt)',
  ready_for_review: '#e07d00',
  approved: '#1a7a45',
  done: '#1a7a45',
  delayed: 'var(--red)',
};

// Build last 6 months labels
function getLast6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en-IN', { month: 'short' }) });
  }
  return months;
}

export default async function ClientOverviewPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/client/login');

  const { data: clientAccount, error: accountError } = await supabase
    .from('client_accounts')
    .select('id, brand_id, is_active, brands(name)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (accountError || !clientAccount || !clientAccount.is_active) redirect('/client/login');

  const brand = (clientAccount as any).brands as { name: string } | null;
  const brandId = clientAccount.brand_id;

  // Fetch open tasks + historical tasks for MoM in one query
  const [openTasksResult, allTasksResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, deliverable, status, deadline, task_type')
      .eq('brand_id', brandId)
      .not('status', 'in', '("cancelled","done","approved")')
      .order('deadline', { ascending: true, nullsFirst: false }),
    supabase
      .from('tasks')
      .select('id, status, deadline')
      .eq('brand_id', brandId)
      .not('status', 'eq', 'cancelled')
      .not('deadline', 'is', null),
  ]);

  const openTasks = openTasksResult.data ?? [];
  const allTasks = allTasksResult.data ?? [];

  // Scope completion MoM — group by deadline month, last 6 months
  const months = getLast6Months();
  const scopeByMonth = months.map(({ key, label }) => {
    const monthTasks = allTasks.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return k === key;
    });
    const total = monthTasks.length;
    const completed = monthTasks.filter(t => t.status === 'approved' || t.status === 'done').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : null;
    return { label, total, completed, pct };
  });

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
              {/* Placeholder bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px', marginBottom: '12px', opacity: 0.15 }}>
                {[40, 55, 35, 65, 50, 70].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--ink)', borderRadius: '3px 3px 0 0' }} />
                ))}
              </div>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(240,237,229,0.85)',
              }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)' }}>
                  Coming Soon
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — MoM + Sentiment (Coming Soon) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[{ label: 'Month on Month Growth', sub: 'Trend across key metrics' }, { label: 'Sentiment Analysis', sub: 'Audience & brand sentiment' }].map(({ label, sub }) => (
          <div key={label} style={{
            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px',
            padding: '24px', minHeight: '180px', position: 'relative', overflow: 'hidden',
          }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '12px', color: 'var(--gray)' }}>{sub}</p>
            {/* Placeholder lines */}
            <div style={{ marginTop: '20px', opacity: 0.1 }}>
              {[80, 55, 70, 45, 65].map((w, i) => (
                <div key={i} style={{ height: '8px', width: `${w}%`, background: 'var(--ink)', borderRadius: '4px', marginBottom: '10px' }} />
              ))}
            </div>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(240,237,229,0.85)',
            }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)' }}>
                Coming Soon
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Section 4 — Active Ops */}
      <div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
          Active Ops
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Left — Open Tasks */}
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
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No open tasks right now.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {openTasks.map((task, i) => {
                  const isLast = i === openTasks.length - 1;
                  const deadline = task.deadline
                    ? new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
                    : null;
                  return (
                    <div key={task.id} style={{
                      padding: '14px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.deliverable}
                        </p>
                        {deadline && (
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>Due {deadline}</p>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap', flexShrink: 0,
                        border: `1px solid ${STATUS_COLOR[task.status] ?? 'var(--line)'}`,
                        color: STATUS_COLOR[task.status] ?? 'var(--gray)',
                      }}>
                        {STATUS_LABEL[task.status] ?? task.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right — Scope Completion MoM */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scope Completion</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '2px' }}>Last 6 months</p>
            </div>
            <div style={{ padding: '20px' }}>
              {scopeByMonth.every(m => m.total === 0) ? (
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', textAlign: 'center', padding: '20px 0' }}>No task data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {scopeByMonth.map(({ label, total, completed, pct }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: pct === null ? 'var(--gray)' : pct >= 80 ? '#1a7a45' : pct >= 50 ? '#e07d00' : 'var(--red)' }}>
                          {pct === null ? '—' : `${pct}%`}
                          {total > 0 && <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>({completed}/{total})</span>}
                        </p>
                      </div>
                      <div style={{ height: '6px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden' }}>
                        {pct !== null && (
                          <div style={{
                            height: '100%', borderRadius: '999px',
                            width: `${pct}%`,
                            background: pct >= 80 ? '#1a7a45' : pct >= 50 ? '#e07d00' : 'var(--red)',
                            transition: 'width 0.3s ease',
                          }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5 — Review / Attention bar */}
      <ClientReviewBar />

    </div>
  );
}
