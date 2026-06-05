import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TeamClient from './team-client';

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('is_team_lead')
    .eq('email', user!.email!)
    .maybeSingle();

  if (!person?.is_team_lead) redirect('/dashboard');

  // IST day boundaries
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const istDateStr = nowIST.toISOString().split('T')[0];
  const dayStart = new Date(`${istDateStr}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${istDateStr}T23:59:59+05:30`).toISOString();

  const [peopleResult, blocksResult] = await Promise.all([
    supabase
      .from('people')
      .select('id, name, email, role, department, seniority, location, is_team_lead, default_hours_per_day')
      .order('department')
      .order('name'),
    supabase
      .from('blocks')
      .select('person_id, start_at, end_at, status, tasks(id, deliverable, estimated_hours, brands(name))')
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .neq('status', 'cancelled'),
  ]);

  const people = peopleResult.data ?? [];
  const blocks = blocksResult.data ?? [];

  // Build capacity map per person
  const capacityMap: Record<string, { blocked: number; blocks: typeof blocks }> = {};
  (blocks as any[]).forEach(b => {
    if (!capacityMap[b.person_id]) capacityMap[b.person_id] = { blocked: 0, blocks: [] };
    capacityMap[b.person_id].blocked += b.tasks?.estimated_hours ?? 0;
    capacityMap[b.person_id].blocks.push(b);
  });

  return <TeamClient people={people as any} capacityMap={capacityMap} />;
}
