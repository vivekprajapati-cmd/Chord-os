import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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
    .select('is_team_lead')
    .eq('email', user!.email!)
    .maybeSingle();

  if (!person?.is_team_lead) redirect('/dashboard');

  const { data: stats } = await supabase
    .from('member_stats')
    .select('*')
    .order('department')
    .order('name');

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
      totalTasks={totalTasks}
      totalCompleted={totalCompleted}
      totalDelays={totalDelays}
      teamOnTimeRate={teamOnTimeRate}
      month={month}
    />
  );
}
