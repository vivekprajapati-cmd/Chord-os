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

export default async function AnalyticsPage() {
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
  const canSeeAll = tier === 'admin' || viewAll;

  let statsQuery = supabase.from('member_stats').select('*');
  if (!canSeeAll && person?.id) statsQuery = statsQuery.eq('person_id', person.id);
  else statsQuery = statsQuery.order('department').order('name');

  const { data: stats } = await statsQuery;
  const members = (stats ?? []) as MemberStat[];

  const totalTasks = members.reduce((a, m) => a + (m.total_tasks ?? 0), 0);
  const totalCompleted = members.reduce((a, m) => a + (m.completed_tasks ?? 0), 0);
  const totalDelays = members.reduce((a, m) => a + (m.total_delays ?? 0), 0);
  const teamOnTimeRate = members.filter(m => m.on_time_rate !== null).length > 0
    ? Math.round(members.reduce((a, m) => a + (m.on_time_rate ?? 0), 0) / members.filter(m => m.on_time_rate !== null).length)
    : null;

  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <AnalyticsClient
      members={members}
      isLead={isLead}
      totalTasks={totalTasks}
      totalCompleted={totalCompleted}
      totalDelays={totalDelays}
      teamOnTimeRate={teamOnTimeRate}
      month={month}
    />
  );
}
