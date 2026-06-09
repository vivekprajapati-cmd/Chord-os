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

export type TeamMember = {
  id: string;
  name: string;
  department: string;
  default_hours_per_day: number | null;
};

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, name, is_team_lead, google_calendar_connected, access_tier, manager_id, default_hours_per_day, department')
    .eq('email', user!.email!)
    .maybeSingle();

  if (!person) return <p className="text-[var(--gray)]">Person record not found. Contact admin.</p>;

  const tier = (person as any).access_tier ?? 'staff';
  const isAdmin = tier === 'admin';
  const isLead = tier === 'lead' || !!(person as any).is_team_lead;

  // Fetch team members for person switcher (leads/admins only)
  let teamMembers: TeamMember[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('people')
      .select('id, name, department, default_hours_per_day')
      .order('department')
      .order('name');
    teamMembers = (data ?? []) as TeamMember[];
  } else if (isLead) {
    const { data: directs } = await supabase
      .from('people')
      .select('id, name, department, default_hours_per_day')
      .eq('manager_id', person.id);
    const directIds = (directs ?? []).map((p: any) => p.id);
    let grands: any[] = [];
    if (directIds.length > 0) {
      const { data } = await supabase
        .from('people')
        .select('id, name, department, default_hours_per_day')
        .in('manager_id', directIds);
      grands = data ?? [];
    }
    // Self first, then direct reports, then their reports
    teamMembers = [
      {
        id: (person as any).id,
        name: (person as any).name,
        department: (person as any).department ?? '',
        default_hours_per_day: (person as any).default_hours_per_day,
      },
      ...(directs ?? []),
      ...grands,
    ] as TeamMember[];
  }

  // Fetch this week's blocks for the logged-in user (initial load)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const istDateStr = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST

  // Compute day-of-week using the IST calendar date (not its UTC representation)
  const istDateUTC = new Date(istDateStr + 'T00:00:00Z');
  const dayOfWeekIST = istDateUTC.getUTCDay(); // 0=Sun … 6=Sat, correct for IST date

  // Monday of this IST week (as a plain calendar date at UTC midnight)
  const mondayDateUTC = new Date(istDateUTC);
  mondayDateUTC.setUTCDate(istDateUTC.getUTCDate() - (dayOfWeekIST === 0 ? 6 : dayOfWeekIST - 1));

  // Week window: Monday 00:00 IST → Sunday 23:59 IST (expressed in UTC)
  const weekStart = new Date(mondayDateUTC.getTime() - IST_OFFSET_MS); // Mon 00:00 IST = Sun 18:30 UTC
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      personId={(person as any).id}
      personName={(person as any).name}
      isLead={isLead}
      isAdmin={isAdmin}
      googleConnected={!!(person as any).google_calendar_connected}
      blocks={(blocks ?? []) as unknown as BlockWithTask[]}
      teamMembers={teamMembers}
      defaultHoursPerDay={(person as any).default_hours_per_day ?? 9}
    />
  );
}
