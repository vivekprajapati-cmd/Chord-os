import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person?.is_team_lead) {
    return NextResponse.json({ error: 'Only team leads can create tasks.' }, { status: 403 });
  }

  const body = await req.json();
  const { brand_id, owner_id, deliverable, task_type, estimated_hours, priority, deadline, notes } = body;

  if (!brand_id || !owner_id || !deliverable || !task_type || !estimated_hours) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      brand_id,
      deliverable,
      task_type,
      owner_id,
      assigned_by_id: person.id,
      priority: priority || 'P1',
      estimated_hours: Number(estimated_hours),
      status: 'scheduled',
      deadline: deadline || null,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error || !task) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  // Create calendar block if deadline provided
  if (deadline) {
    const endAt = new Date(deadline).toISOString();
    const startAt = new Date(new Date(deadline).getTime() - Number(estimated_hours) * 3600000).toISOString();
    await supabase.from('blocks').insert({
      task_id: task.id,
      person_id: owner_id,
      start_at: startAt,
      end_at: endAt,
      status: 'scheduled',
    });
  }

  await supabase.from('activity_log').insert({
    actor_id: person.id,
    action: 'task_created',
    task_id: task.id,
    details: { deliverable, owner_id, priority, hours: estimated_hours },
  });

  return NextResponse.json({ id: task.id });
}
