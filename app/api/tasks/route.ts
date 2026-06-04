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
  const { brand_id, owner_id, reviewer_id, deliverable, task_type, estimated_hours, priority, start_date, deadline, notes } = body;

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
      reviewer_id: reviewer_id || null,
      assigned_by_id: person.id,
      priority: priority || 'P1',
      estimated_hours: Number(estimated_hours),
      status: 'scheduled',
      start_date: start_date || null,
      deadline: deadline || null,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error || !task) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  // Create calendar block — always, defaulting to today if no dates given
  const hasEstimatedHours = !!estimated_hours && Number(estimated_hours) > 0;
  if (hasEstimatedHours) {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const defaultStart = new Date(nowIST);
    defaultStart.setMinutes(0, 0, 0); // round to current hour
    const defaultStartUTC = new Date(defaultStart.getTime() - 5.5 * 60 * 60 * 1000);

    const startAt = start_date
      ? new Date(start_date).toISOString()
      : defaultStartUTC.toISOString();
    const endAt = deadline
      ? new Date(deadline).toISOString()
      : new Date(new Date(startAt).getTime() + Number(estimated_hours) * 3600000).toISOString();

    // Conflict detection — check for overlapping blocks
    if (startAt && endAt) {
      const { data: conflicts } = await supabase
        .from('blocks')
        .select('id, start_at, end_at, tasks(deliverable, brands(name))')
        .eq('person_id', owner_id)
        .eq('status', 'scheduled')
        .lt('start_at', endAt)
        .gt('end_at', startAt);

      if (conflicts && conflicts.length > 0) {
        const existing = conflicts[0] as any;
        const existingTask = existing.tasks?.deliverable ?? 'another task';
        const existingBrand = existing.tasks?.brands?.name ?? '';
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const fmtTime = (iso: string) => new Date(new Date(iso).getTime() + IST_OFFSET)
          .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        const fmtDate = (iso: string) => new Date(new Date(iso).getTime() + IST_OFFSET)
          .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const blockedSlot = `${fmtDate(existing.start_at)}, ${fmtTime(existing.start_at)} – ${fmtTime(existing.end_at)} IST`;
        // Delete the just-created task since we can't create the block
        await supabase.from('tasks').delete().eq('id', task.id);
        return NextResponse.json({
          error: `Conflict: "${existingTask}"${existingBrand ? ` (${existingBrand})` : ''} is already blocked from ${blockedSlot}. Pick a different time slot.`
        }, { status: 409 });
      }
    }

    await supabase.from('blocks').insert({
      task_id: task.id,
      person_id: owner_id,
      start_at: startAt,
      end_at: endAt,
      status: 'scheduled',
    });
  } // end hasEstimatedHours

  await supabase.from('activity_log').insert({
    actor_id: person.id,
    action: 'task_created',
    task_id: task.id,
    details: { deliverable, owner_id, priority, hours: estimated_hours },
  });

  return NextResponse.json({ id: task.id });
}
