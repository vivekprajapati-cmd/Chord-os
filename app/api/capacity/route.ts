import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const personId = searchParams.get('person_id');
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  // Use IST boundaries
  const dayStart = new Date(`${date}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59+05:30`).toISOString();

  // Get person's daily hours limit
  const { data: person } = await supabase
    .from('people')
    .select('id, name, default_hours_per_day')
    .eq(personId ? 'id' : 'email', personId ?? user.email!)
    .maybeSingle();

  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

  // Get blocks for that day
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, start_at, end_at, status, tasks(estimated_hours)')
    .eq('person_id', person.id)
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)
    .neq('status', 'cancelled');

  const blockedHours = (blocks ?? []).reduce((acc, b) => {
    const hours = (b.tasks as any)?.estimated_hours ?? 0;
    return acc + hours;
  }, 0);

  const totalHours = person.default_hours_per_day ?? 9;
  const remainingHours = Math.max(0, totalHours - blockedHours);
  const utilizationPct = Math.round((blockedHours / totalHours) * 100);

  return NextResponse.json({
    person_id: person.id,
    name: person.name,
    total_hours: totalHours,
    blocked_hours: blockedHours,
    remaining_hours: remainingHours,
    utilization_pct: utilizationPct,
    date,
  });
}

// Team capacity — all people for today
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { date } = await req.json().catch(() => ({}));
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const targetDate = date ?? new Date().toISOString().split('T')[0];
  // Convert IST midnight to UTC
  const dayStartIST = new Date(`${targetDate}T00:00:00+05:30`);
  const dayEndIST = new Date(`${targetDate}T23:59:59+05:30`);
  const dayStart = dayStartIST.toISOString();
  const dayEnd = dayEndIST.toISOString();

  const { data: people } = await supabase
    .from('people')
    .select('id, name, department, default_hours_per_day')
    .order('name');

  const { data: blocks } = await supabase
    .from('blocks')
    .select('person_id, tasks(estimated_hours)')
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)
    .neq('status', 'cancelled');

  const blockedByPerson: Record<string, number> = {};
  (blocks ?? []).forEach((b: any) => {
    blockedByPerson[b.person_id] = (blockedByPerson[b.person_id] ?? 0) + (b.tasks?.estimated_hours ?? 0);
  });

  const capacity = (people ?? []).map((p: any) => {
    const total = p.default_hours_per_day ?? 9;
    const blocked = blockedByPerson[p.id] ?? 0;
    return {
      person_id: p.id,
      name: p.name,
      department: p.department,
      total_hours: total,
      blocked_hours: blocked,
      remaining_hours: Math.max(0, total - blocked),
      utilization_pct: Math.round((blocked / total) * 100),
    };
  });

  return NextResponse.json({ capacity, date: targetDate });
}
