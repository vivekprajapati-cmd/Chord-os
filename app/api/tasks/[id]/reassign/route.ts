import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySlack } from '@/lib/slack';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, name, access_tier, is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'lead' && !person?.is_team_lead) {
    return NextResponse.json({ error: 'Not authorized to reassign tasks.' }, { status: 403 });
  }

  const body = await req.json();
  const { new_owner_id } = body;
  if (!new_owner_id) return NextResponse.json({ error: 'new_owner_id required.' }, { status: 400 });

  // Fetch task + old owner for Slack message
  const { data: task } = await supabase
    .from('tasks')
    .select('id, deliverable, owner_id, brands(name), owner:people!tasks_owner_id_fkey(name)')
    .eq('id', id)
    .maybeSingle();

  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

  // Fetch new owner name
  const { data: newOwner } = await supabase
    .from('people')
    .select('name')
    .eq('id', new_owner_id)
    .maybeSingle();

  // Update task owner
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ owner_id: new_owner_id })
    .eq('id', id);

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  // Update block person_id (if a block exists for this task)
  await supabase
    .from('blocks')
    .update({ person_id: new_owner_id })
    .eq('task_id', id);

  // Activity log
  await supabase.from('activity_log').insert({
    actor_id: person!.id,
    action: 'task_reassigned',
    task_id: id,
    details: {
      from: (task.owner as any)?.name ?? task.owner_id,
      to: newOwner?.name ?? new_owner_id,
      by: person!.name,
    },
  });

  // Slack notification
  const brand = (task.brands as any)?.name ?? '';
  const oldOwner = (task.owner as any)?.name ?? 'someone';
  await notifySlack(
    `🔄 *Task reassigned* — "${task.deliverable}"${brand ? ` · ${brand}` : ''} · from ${oldOwner} → *${newOwner?.name ?? new_owner_id}* · by ${person!.name}`
  );

  return NextResponse.json({ ok: true });
}
