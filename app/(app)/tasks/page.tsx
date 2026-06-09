import { createClient } from '@/lib/supabase/server';
import TaskCreateButton from '@/components/task-create-button';
import TaskListClient from '@/components/task-list-client';

type Task = {
  id: string;
  deliverable: string;
  task_type: string;
  task_name: string | null;
  priority: string;
  status: string;
  estimated_hours: number | null;
  start_date: string | null;
  deadline: string | null;
  meeting_id: string | null;
  owner_id: string;
  reviewer_id: string | null;
  submission_link: string | null;
  notes: string | null;
  brand_id: string;
  brands: { name: string } | null;
  owner: { name: string } | null;
};

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
    .select('id, name, access_tier, view_all, manager_id, is_team_lead')
    .eq('email', user!.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  const viewAll = !!(person as any)?.view_all;
  const canCreate = true; // all tiers can create tasks (staff locked to self)
  const isStaff = tier === 'staff' || tier === 'viewer' || tier === 'operations';
  const isAdmin = tier === 'admin';
  const isLead = tier === 'lead';
  const isViewer = tier === 'viewer';

  // Build list of team member IDs this person can see/assign
  let teamMemberIds: string[] = [];

  if (isLead || isAdmin) {
    // Fetch direct reports
    const { data: directReports } = await supabase
      .from('people')
      .select('id, manager_id')
      .eq('manager_id', person?.id);

    const directIds = (directReports ?? []).map((p: any) => p.id);

    // Fetch one level deeper (grandreports)
    let grandIds: string[] = [];
    if (directIds.length > 0) {
      const { data: grandReports } = await supabase
        .from('people')
        .select('id')
        .in('manager_id', directIds);
      grandIds = (grandReports ?? []).map((p: any) => p.id);
    }

    teamMemberIds = [person!.id, ...directIds, ...grandIds];
  }

  // For viewers scoped to Pierre + Nimesh's teams
  let viewerScopeIds: string[] = [];
  if (isViewer && !viewAll) {
    // Fetch Pierre and Nimesh's team members
    const { data: pierreNimesh } = await supabase
      .from('people')
      .select('id')
      .ilike('name', '%Pierre%');
    const { data: nimeshPeople } = await supabase
      .from('people')
      .select('id')
      .ilike('name', '%Nimesh%');

    const topIds = [
      ...(pierreNimesh ?? []).map((p: any) => p.id),
      ...(nimeshPeople ?? []).map((p: any) => p.id),
    ];

    if (topIds.length > 0) {
      const { data: scopedTeam } = await supabase
        .from('people')
        .select('id')
        .in('manager_id', topIds);

      const level2Ids = (scopedTeam ?? []).map((p: any) => p.id);
      let level3Ids: string[] = [];
      if (level2Ids.length > 0) {
        const { data: level3 } = await supabase
          .from('people')
          .select('id')
          .in('manager_id', level2Ids);
        level3Ids = (level3 ?? []).map((p: any) => p.id);
      }
      viewerScopeIds = [...topIds, ...level2Ids, ...level3Ids];
    }
  }

  const statusFilter = params.status;
  const isDelayedFilter = statusFilter === 'delayed';

  const [tasksResult, brandsResult, peopleResult] = await Promise.all([
    (() => {
      let q = supabase
        .from('tasks')
        .select('id, deliverable, task_type, task_name, priority, status, estimated_hours, start_date, deadline, meeting_id, owner_id, reviewer_id, submission_link, notes, brand_id, brands(name), owner:people!tasks_owner_id_fkey(name)')
        .order('priority', { ascending: true })
        .order('deadline', { ascending: true, nullsFirst: false })
        .limit(100);

      // Visibility scoping
      if (isAdmin || viewAll) {
        // See all — no filter
      } else if (isLead) {
        // See team tasks + tasks they review
        if (teamMemberIds.length > 0) {
          q = q.or(`owner_id.in.(${teamMemberIds.join(',')}),reviewer_id.eq.${person?.id}`);
        } else {
          q = q.eq('reviewer_id', person?.id);
        }
      } else if (isViewer && !viewAll) {
        // Scoped to Pierre + Nimesh's teams
        if (viewerScopeIds.length > 0) {
          q = q.in('owner_id', viewerScopeIds);
        }
      } else {
        // Staff — own tasks only (+ reviewer)
        if (statusFilter === 'ready_for_review') {
          q = q.or(`owner_id.eq.${person?.id},reviewer_id.eq.${person?.id}`);
        } else {
          q = q.eq('owner_id', person?.id);
        }
      }

      if (isDelayedFilter) {
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
    // All leads can assign to anyone
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
              { href: '/tasks',                         label: 'Active',       active: !statusFilter,                       activeColor: 'var(--coral)' },
              { href: '/tasks?status=scheduled',        label: 'Scheduled',    active: statusFilter === 'scheduled',         activeColor: 'var(--coral)' },
              { href: '/tasks?status=ready_for_review', label: 'Review queue', active: statusFilter === 'ready_for_review', activeColor: 'var(--coral)' },
              { href: '/tasks?status=delayed',          label: 'Delayed',      active: statusFilter === 'delayed',           activeColor: 'var(--red)' },
              { href: '/tasks?status=done',             label: 'Done',         active: statusFilter === 'done',              activeColor: 'var(--coral)' },
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
          {canCreate && <TaskCreateButton brands={brands} people={people} isStaff={isStaff} currentPersonId={person?.id ?? ''} />}
        </div>
      </div>

      <TaskListClient
        tasks={tasks}
        people={people}
        brands={brands}
        canEdit={canCreate}
        statusFilter={statusFilter}
        currentUserName={person?.name ?? ''}
      />
    </div>
  );
}
