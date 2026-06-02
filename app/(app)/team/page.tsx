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

  const { data: people } = await supabase
    .from('people')
    .select('id, name, email, role, department, seniority, location, is_team_lead')
    .order('department')
    .order('name');

  return <TeamClient people={people ?? []} />;
}
