import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySlack } from '@/lib/slack';
import { logActivity } from '@/lib/activity';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, name, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  const isAdminOrLead = tier === 'admin' || tier === 'lead';

  if (!isAdminOrLead) {
    // Staff can only edit tasks they own
    const { data: taskCheck } = await supabase
      .from('tasks')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle();
    if (!taskCheck || taskCheck.owner_id !== person?.id) {
      return NextResponse.json({ error: 'Not authorized to edit tasks.' }, { status: 403 });
    }
  }

  const body = await req.json();
  const { brand_id, owner_id, reviewer_id, deliverable, task_type, task_name, priority, start_date, deadline, notes } = body;

  // Fetch original task for comparison
  const { data: original } = await supabase
    .from('tasks')
    .select('id, deliverable, owner_id, reviewer_id, brand_id, task_type, priority, start_date, deadline, brands(name), owner:people!tasks_owner_id_fkey(name)')
    .eq('id', id)
    .maybeSingle();

  if (!original) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

  // Calculate hours from start/end
  let estimated_hours: number | null = null;
  let startAt: string | null = null;
  let endAt: string | null = null;

  if (start_date && deadline) {
    const startMs = new Date(start_date).getTime();
    const endMs = new Date(deadline).getTime();
    if (endMs <= startMs) return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
    estimated_hours = Math.round(((endMs - startMs) / 3600000) * 10) / 10;
    startAt = new Date(start_date).toISOString();
    endAt = new Date(deadline).toISOString();
  }

  // Conflict detection if time or person changed
  const normalize = (v: string | null | undefined) => v ? new Date(v).toISOString() : null;
  const timeChanged = normalize(startAt) !== normalize(original.start_date) || normalize(endAt) !== normalize(original.deadline);
  const personChanged = owner_id && owner_id !== original.owner_id;

  if (startAt && endAt && (timeChanged || personChanged)) {
    const checkOwner = owner_id ?? original.owner_id;
    const { data: overlapping } = await supabase
      .from('blocks')
      .select('id, start_at, end_at, task_id')
      .eq('person_id', checkOwner)
      .neq('task_id', id) // exclude this task's own block
      .lt('start_at', endAt)
      .gt('end_at', startAt);

    if ((overlapping ?? []).length > 0) {
      const taskIds = (overlapping ?? []).map((b: any) => b.task_id).filter(Boolean);
      const { data: conflictTasks } = taskIds.length > 0
        ? await supabase.from('tasks').select('id, deliverable, status, brands(name)').in('id', taskIds)
        : { data: [] };

      const activeTasks = (conflictTasks ?? []).filter(
        (t: any) => !['done', 'approved', 'cancelled'].includes(t.status)
      );

      if (activeTasks.length > 0) {
        const block = (overlapping ?? []).find((b: any) => b.task_id === (activeTasks[0] as any).id) as any;
        const existingTask = (activeTasks[0] as any).deliverable ?? 'another task';
        const existingBrand = (activeTasks[0] as any).brands?.name ?? '';
        const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const blockedSlot = `${fmtDate(block.start_at)}, ${fmtTime(block.start_at)} – ${fmtTime(block.end_at)}`;
        return NextResponse.json({
          error: `Conflict: "${existingTask}"${existingBrand ? ` (${existingBrand})` : ''} is already blocked from ${blockedSlot}. Pick a different time slot.`
        }, { status: 409 });
      }
    }
  }

  // Update task
  const { error: updateError } = await supabase.from('tasks').update({
    ...(brand_id && { brand_id }),
    ...(owner_id && { owner_id }),
    reviewer_id: reviewer_id || null,
    ...(deliverable && { deliverable }),
    ...(task_type && { task_type }),
    ...(task_name !== undefined && { task_name }),
    ...(priority && { priority }),
    ...(estimated_hours !== null && { estimated_hours }),
    start_date: start_date || null,
    deadline: deadline || null,
    notes: notes || null,
  }).eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Update block
  if (startAt && endAt) {
    const { data: existingBlock } = await supabase.from('blocks').select('id').eq('task_id', id).maybeSingle();
    if (existingBlock) {
      await supabase.from('blocks').update({
        start_at: startAt,
        end_at: endAt,
        ...(owner_id && { person_id: owner_id }),
      }).eq('task_id', id);
    } else {
      await supabase.from('blocks').insert({
        task_id: id,
        person_id: owner_id ?? original.owner_id,
        start_at: startAt,
        end_at: endAt,
        status: 'scheduled',
      });
    }
  }

  // Build change summary for Slack + logs
  const changes: string[] = [];
  if (deliverable && deliverable !== original.deliverable) changes.push(`deliverable → "${deliverable}"`);
  if (personChanged) changes.push(`reassigned to ${body.ownerName ?? owner_id}`);
  if (priority && priority !== original.priority) changes.push(`priority → ${priority}`);
  if (task_type && task_type !== original.task_type) changes.push(`type → ${task_type}`);
  if (timeChanged) changes.push(`time updated`);

  const brandChanged = brand_id && brand_id !== original.brand_id;
  if (brandChanged) {
    const { data: newBrand } = await supabase.from('brands').select('name').eq('id', brand_id).maybeSingle();
    changes.push(`brand → ${(newBrand as any)?.name ?? brand_id}`);
  }

  const reviewerChanged = reviewer_id !== undefined && reviewer_id !== original.reviewer_id;
  if (reviewerChanged) {
    if (!reviewer_id) {
      changes.push(`reviewer removed`);
    } else {
      const { data: newReviewer } = await supabase.from('people').select('name').eq('id', reviewer_id).maybeSingle();
      changes.push(`reviewer → ${(newReviewer as any)?.name ?? reviewer_id}`);
    }
  }

  const brand = (original.brands as any)?.name ?? '';
  const taskLabel = deliverable ?? original.deliverable;

  await notifySlack(
    `✏️ *Task updated* — "${taskLabel}"${brand ? ` · ${brand}` : ''} · by ${person!.name}${changes.length ? ` · ${changes.join(', ')}` : ''}`
  );

  void logActivity({
    actor_name: person!.name,
    actor_email: user.email!,
    action: 'task.edit',
    entity_type: 'task',
    entity_id: id,
    description: `Task "${taskLabel}"${brand ? ` · ${brand}` : ''} edited by ${person!.name}${changes.length ? ` · ${changes.join(', ')}` : ''}`,
    metadata: { changes },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'lead') {
    return NextResponse.json({ error: 'Not authorized to delete tasks.' }, { status: 403 });
  }

  const { data: taskToDelete } = await supabase.from('tasks').select('deliverable, brands(name)').eq('id', id).maybeSingle();

  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logActivity({
    actor_name: user.email!,
    actor_email: user.email!,
    action: 'task.delete',
    entity_type: 'task',
    entity_id: id,
    description: `Task "${taskToDelete?.deliverable ?? id}" deleted · ${(taskToDelete?.brands as any)?.name ?? ''}`,
  });

  return NextResponse.json({ ok: true });
}
