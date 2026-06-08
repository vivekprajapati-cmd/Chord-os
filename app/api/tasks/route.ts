import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySlack } from '@/lib/slack';

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
  const { brand_id, owner_id, reviewer_id, deliverable, task_type, task_name, priority, start_date, deadline, notes } = body;

  if (!brand_id || !owner_id || !deliverable || !task_type) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Calculate hours from start/end times if both provided
  let estimated_hours: number | null = null;
  let startAt: string | null = null;
  let endAt: string | null = null;

  if (start_date && deadline) {
    // Store exactly what the user typed — no timezone conversion
    const startMs = new Date(start_date).getTime();
    const endMs = new Date(deadline).getTime();
    if (endMs <= startMs) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
    }
    estimated_hours = Math.round(((endMs - startMs) / 3600000) * 10) / 10;
    startAt = new Date(start_date).toISOString();
    endAt = new Date(deadline).toISOString();
  }

  // Conflict detection — only if we have a time slot, only for the assigned person
  if (startAt && endAt) {
    const { data: overlapping } = await supabase
      .from('blocks')
      .select('id, start_at, end_at, task_id')
      .eq('person_id', owner_id)
      .lt('start_at', endAt)
      .gt('end_at', startAt);

    if ((overlapping ?? []).length > 0) {
      // Check task statuses in JS — exclude done/approved/cancelled
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

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      brand_id,
      deliverable,
      task_type,
      task_name: task_name || null,
      owner_id,
      reviewer_id: reviewer_id || null,
      assigned_by_id: person.id,
      priority: priority || 'P1',
      estimated_hours,
      status: 'scheduled',
      start_date: start_date || null,
      deadline: deadline || null,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error || !task) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  // Create calendar block if we have a time window
  if (startAt && endAt) {
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

  // Slack notification
  const [{ data: brandData }, { data: ownerData }, { data: assignerData }, { data: reviewerData }] = await Promise.all([
    supabase.from('brands').select('name').eq('id', brand_id).maybeSingle(),
    supabase.from('people').select('name').eq('id', owner_id).maybeSingle(),
    supabase.from('people').select('name').eq('id', person.id).maybeSingle(),
    reviewer_id ? supabase.from('people').select('name').eq('id', reviewer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : 'No deadline';

  await notifySlack(
    `📋 *New task assigned* — ${ownerData?.name ?? 'Someone'} · *${brandData?.name ?? ''}* · "${deliverable}" · ${priority} · Due: ${deadlineStr} · Assigned by ${assignerData?.name ?? 'lead'}${reviewerData?.name ? ` · Reviewer: ${reviewerData.name}` : ''}`
  );

  return NextResponse.json({ id: task.id });
}
