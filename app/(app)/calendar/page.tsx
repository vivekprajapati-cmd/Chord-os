import { createClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';

export type BlockWithTask = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  actual_hours: number | null;
  tasks: {
    id: string;
    deliverable: string;
    task_type: string;
    priority: string;
    estimated_hours: number;
    notes: string | null;
    status: string;
    owner_id: string;
    reviewer_id: string | null;
    brands: {
      id: string;
      slug: string;
      name: string;
      colors: Record<string, string>;
      typography: Record<string, string>;
      voice_summary: string | null;
    };
    owner: { id: string; name: string };
    reviewer: { id: string; name: string } | null;
    references: { id: string; ref_type: string; url: string | null; caption: string | null }[];
  };
};

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, name, is_team_lead, google_calendar_connected')
    .eq('email', user!.email!)
    .maybeSingle();

  if (!person) return <p className="text-[var(--gray)]">Person record not found. Contact admin.</p>;

  // Fetch this week's blocks for this person
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1)); // Mon

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: blocks } = await supabase
    .from('blocks')
    .select(`
      id, start_at, end_at, status, actual_hours,
      tasks (
        id, deliverable, task_type, priority, estimated_hours, notes, status, owner_id, reviewer_id,
        brands ( id, slug, name, colors, typography, voice_summary ),
        owner:people!tasks_owner_id_fkey ( id, name ),
        reviewer:people!tasks_reviewer_id_fkey ( id, name ),
        references:task_references ( id, ref_type, url, caption )
      )
    `)
    .eq('person_id', person.id)
    .gte('start_at', weekStart.toISOString())
    .lt('start_at', weekEnd.toISOString())
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true });

  return (
    <CalendarClient
      personId={person.id}
      personName={person.name}
      isLead={person.is_team_lead}
      googleConnected={!!(person as any).google_calendar_connected}
      blocks={(blocks ?? []) as BlockWithTask[]}
    />
  );
}
