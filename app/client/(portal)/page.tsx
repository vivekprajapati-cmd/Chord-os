import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  ready_for_review: 'In Review',
  approved: 'Approved',
  done: 'Done',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'var(--gray)',
  in_progress: 'var(--cobalt)',
  ready_for_review: '#e07d00',
  approved: '#1a7a45',
  done: '#1a7a45',
};

export default async function ClientOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id, brands(name)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount) redirect('/client/login');

  const brand = (clientAccount as any).brands as { name: string } | null;

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, deliverable, status, deadline, flexible')
    .eq('brand_id', clientAccount.brand_id)
    .not('status', 'in', '("cancelled","done")')
    .order('deadline', { ascending: true, nullsFirst: false });

  const activeTasks = tasks ?? [];
  const total = activeTasks.length;
  const inProgress = activeTasks.filter(t => t.status === 'in_progress').length;
  const inReview = activeTasks.filter(t => t.status === 'ready_for_review').length;
  const approved = activeTasks.filter(t => t.status === 'approved').length;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '44px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '4px' }}>
        {brand?.name ?? 'Your Project'}
      </h1>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '32px' }}>
        Project Overview
      </p>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Active Tasks', value: total },
          { label: 'In Progress', value: inProgress },
          { label: 'In Review', value: inReview },
          { label: 'Approved', value: approved },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: '14px', padding: '18px 20px', boxShadow: '4px 4px 0 var(--ink)' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--f-display)', fontSize: '36px', lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Task list */}
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
        Deliverables
      </p>

      {activeTasks.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>No active deliverables right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTasks.map(task => {
            const deadline = task.deadline
              ? new Date(task.deadline).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
                })
              : null;

            return (
              <div key={task.id} style={{
                background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px',
                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>{task.deliverable}</p>
                  {deadline && (
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>
                      Due {deadline}
                    </p>
                  )}
                </div>
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '4px 12px', borderRadius: '999px',
                  border: `1px solid ${STATUS_COLOR[task.status] ?? 'var(--line)'}`,
                  color: STATUS_COLOR[task.status] ?? 'var(--gray)',
                  whiteSpace: 'nowrap',
                }}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
