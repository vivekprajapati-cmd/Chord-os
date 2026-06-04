import { createClient } from '@/lib/supabase/server';
import TaskCreateButton from '@/components/task-create-button';
import TaskListClient from '@/components/task-list-client';

type Task = {
  id: string;
  deliverable: string;
  task_type: string;
  priority: string;
  status: string;
  estimated_hours: number | null;
  deadline: string | null;
  meeting_id: string | null;
  owner_id: string;
  reviewer_id: string | null;
  brands: { name: string } | null;
  owner: { name: string } | null;
};

const STATUS_ORDER = ['in_progress', 'scheduled', 'ready_for_review', 'approved', 'done'];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, name, is_team_lead')
    .eq('email', user!.email!)
    .maybeSingle();

  const canSeeAll = !!person?.is_team_lead;
  const canCreate = !!person?.is_team_lead;

  const statusFilter = params.status;
  const isDelayedFilter = statusFilter === 'delayed';

  const [tasksResult, brandsResult, peopleResult] = await Promise.all([
    (() => {
      let q = supabase
        .from('tasks')
        .select('id, deliverable, task_type, priority, status, estimated_hours, deadline, meeting_id, owner_id, reviewer_id, brands(name), owner:people!tasks_owner_id_fkey(name)')
        .order('priority', { ascending: true })
        .order('deadline', { ascending: true, nullsFirst: false })
        .limit(100);

      // Review queue — show tasks where user is owner OR reviewer
      if (!canSeeAll && statusFilter === 'ready_for_review') {
        q = q.or(`owner_id.eq.${person?.id},reviewer_id.eq.${person?.id}`);
      } else if (!canSeeAll) {
        q = q.eq('owner_id', person?.id);
      }

      if (isDelayedFilter) {
        // Overdue: past deadline, not submitted, not done/approved/cancelled
        q = q
          .lt('deadline', new Date().toISOString())
          .is('submitted_at', null)
          .not('status', 'in', '("done","approved","cancelled")');
      } else if (statusFilter) {
        q = q.eq('status', statusFilter);
      } else {
        q = q.not('status', 'in', '("done","cancelled")');
      }

      return q;
    })(),
    supabase.from('brands').select('id, name, slug').eq('status', 'active').order('name'),
    supabase.from('people').select('id, name, department').order('name'),
  ]);

  const tasks = (tasksResult.data ?? []) as unknown as Task[];
  const brands = (brandsResult.data ?? []) as { id: string; name: string; slug: string }[];
  const people = (peopleResult.data ?? []) as { id: string; name: string; department: string }[];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-5xl uppercase tracking-tight">Tasks</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[
              { href: '/tasks',                         label: 'Active',       active: !statusFilter,                        activeColor: 'var(--coral)' },
              { href: '/tasks?status=scheduled',        label: 'Scheduled',    active: statusFilter === 'scheduled',          activeColor: 'var(--coral)' },
              { href: '/tasks?status=ready_for_review', label: 'Review queue', active: statusFilter === 'ready_for_review',  activeColor: 'var(--coral)' },
              { href: '/tasks?status=delayed',          label: 'Delayed',      active: statusFilter === 'delayed',            activeColor: 'var(--red)' },
              { href: '/tasks?status=done',             label: 'Done',         active: statusFilter === 'done',               activeColor: 'var(--coral)' },
            ].map(({ href, label, active, activeColor }) => (
              <a
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: `1px solid ${active ? activeColor : 'var(--line)'}`,
                  background: active ? activeColor : 'transparent',
                  color: active ? 'var(--cream)' : 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                {label}
              </a>
            ))}
          </div>
          {canCreate && <TaskCreateButton brands={brands} people={people} />}
        </div>
      </div>

      <TaskListClient tasks={tasks} people={people} canEdit={canSeeAll} statusFilter={statusFilter} currentUserName={person?.name ?? ''} />
    </div>
  );
}
