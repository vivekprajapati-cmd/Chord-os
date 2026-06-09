import { createClient } from '@/lib/supabase/server';
import AnalyticsClient from './analytics-client';

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

// ── Date range helpers ────────────────────────────────────────────────────────
function getISTDateString(offsetDays = 0): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const d = new Date(Date.now() + IST_OFFSET_MS + offsetDays * 86400000);
  return d.toISOString().split('T')[0];
}

function deriveDateRange(period: string | undefined, from: string | undefined, to: string | undefined): { from: string; to: string; label: string } {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const todayStr = nowIST.toISOString().split('T')[0];

  if (period === 'weekly') {
    // ISO week: Mon–Sun
    const istDateUTC = new Date(todayStr + 'T00:00:00Z');
    const dow = istDateUTC.getUTCDay(); // 0=Sun
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monDate = new Date(istDateUTC);
    monDate.setUTCDate(istDateUTC.getUTCDate() + diffToMon);
    const sunDate = new Date(monDate);
    sunDate.setUTCDate(monDate.getUTCDate() + 6);
    const monStr = monDate.toISOString().split('T')[0];
    const sunStr = sunDate.toISOString().split('T')[0];
    const label = `Week of ${monDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${sunDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    return { from: monStr, to: sunStr, label };
  }

  if (period === 'custom' && from && to) {
    const label = `${new Date(from + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} – ${new Date(to + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
    return { from, to, label };
  }

  // Default: this month
  const year = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth(); // 0-indexed
  const firstDay = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).toISOString().split('T')[0];
  const label = nowIST.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { from: firstDay, to: lastDay, label };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, is_team_lead, access_tier, view_all')
    .eq('email', user!.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  const viewAll = !!(person as any)?.view_all;
  const isLead = tier === 'admin' || tier === 'lead' || tier === 'viewer';
  const canSeeAll = tier === 'admin' || tier === 'lead' || viewAll;

  // ── Derive date range ──────────────────────────────────────────────────────
  const { from: dateFrom, to: dateTo, label: periodLabel } = deriveDateRange(
    searchParams.period,
    searchParams.from,
    searchParams.to,
  );

  const rangeStart = new Date(`${dateFrom}T00:00:00+05:30`).toISOString();
  const rangeEnd = new Date(`${dateTo}T23:59:59+05:30`).toISOString();

  // ── Member stats — query tasks directly so we can date-filter ──────────────
  const { data: allPeople } = canSeeAll
    ? await supabase.from('people').select('id, name, department').order('department').order('name')
    : person?.id
      ? await supabase.from('people').select('id, name, department').eq('id', person.id)
      : { data: [] };

  const { data: periodTasks } = await supabase
    .from('tasks')
    .select('id, owner_id, status, deadline, start_date, priority')
    .not('status', 'eq', 'cancelled')
    .gte('start_date', rangeStart)
    .lte('start_date', rangeEnd);

  // Build member stats from period tasks
  const statsMap: Record<string, { total: number; completed: number; active: number; delays: number }> = {};
  (periodTasks ?? []).forEach((t: any) => {
    if (!statsMap[t.owner_id]) statsMap[t.owner_id] = { total: 0, completed: 0, active: 0, delays: 0 };
    statsMap[t.owner_id].total += 1;
    if (['approved', 'done'].includes(t.status)) statsMap[t.owner_id].completed += 1;
    if (!['approved', 'done'].includes(t.status)) statsMap[t.owner_id].active += 1;
    // Delay: deadline passed and not completed
    if (t.deadline && new Date(t.deadline) < new Date() && !['approved', 'done'].includes(t.status)) {
      statsMap[t.owner_id].delays += 1;
    }
  });

  const members: MemberStat[] = (allPeople ?? []).map((p: any) => {
    const s = statsMap[p.id] ?? { total: 0, completed: 0, active: 0, delays: 0 };
    const onTimeRate = s.total > 0 ? Math.round(((s.total - s.delays) / s.total) * 100) : null;
    return {
      person_id: p.id,
      name: p.name,
      department: p.department,
      total_tasks: s.total,
      completed_tasks: s.completed,
      on_time_count: s.total - s.delays,
      late_count: s.delays,
      total_delays: s.delays,
      on_time_rate: onTimeRate,
      avg_turnaround_hours: null,
      active_tasks: s.active,
    };
  });

  const totalTasks = members.reduce((a, m) => a + m.total_tasks, 0);
  const totalCompleted = members.reduce((a, m) => a + m.completed_tasks, 0);
  const totalDelays = members.reduce((a, m) => a + m.total_delays, 0);
  const ratedMembers = members.filter(m => m.on_time_rate !== null && m.total_tasks > 0);
  const teamOnTimeRate = ratedMembers.length > 0
    ? Math.round(ratedMembers.reduce((a, m) => a + (m.on_time_rate ?? 0), 0) / ratedMembers.length)
    : null;

  // ── Brands + brand tasks (date-filtered) ──────────────────────────────────
  const { data: brandsData } = isLead
    ? await supabase.from('brands').select('id, name, slug').eq('status', 'active').order('name')
    : { data: [] };

  const { data: brandTasksData } = isLead
    ? await supabase
        .from('tasks')
        .select('brand_id, estimated_hours, status, owner_id, start_date, brands(id, name), owner:people!tasks_owner_id_fkey(id, name)')
        .not('status', 'eq', 'cancelled')
        .gte('start_date', rangeStart)
        .lte('start_date', rangeEnd)
    : { data: [] };

  return (
    <AnalyticsClient
      members={members}
      isLead={isLead}
      canSeeAll={canSeeAll}
      totalTasks={totalTasks}
      totalCompleted={totalCompleted}
      totalDelays={totalDelays}
      teamOnTimeRate={teamOnTimeRate}
      month={periodLabel}
      brands={(brandsData ?? []) as { id: string; name: string; slug: string }[]}
      brandTasks={(brandTasksData ?? []) as any[]}
      currentPeriod={searchParams.period ?? 'monthly'}
      currentFrom={searchParams.from ?? ''}
      currentTo={searchParams.to ?? ''}
    />
  );
}
