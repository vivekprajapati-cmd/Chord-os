import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySlack } from '@/lib/slack';

// ─── Recurrence slot generator ────────────────────────────────────────────────
type RecurrenceConfig = {
  pattern: 'weekdays' | 'daily' | 'weekly' | 'custom';
  customDays?: number[]; // 0=Mon … 6=Sun
  endType: 'occurrences' | 'end_date';
  occurrences?: number;
  endDate?: string; // YYYY-MM-DD
};

function generateSlots(
  startIso: string,
  endIso: string,
  rec: RecurrenceConfig
): Array<{ start: string; end: string }> {
  const startDate = new Date(startIso);
  const durationMs = new Date(endIso).getTime() - startDate.getTime();

  // Time-of-day in UTC (stored as-is)
  const startH = startDate.getUTCHours();
  const startM = startDate.getUTCMinutes();

  // Which days of week are active (0=Mon, 6=Sun)
  let activeDays: number[];
  if (rec.pattern === 'daily') {
    activeDays = [0, 1, 2, 3, 4, 5, 6];
  } else if (rec.pattern === 'weekdays') {
    activeDays = [0, 1, 2, 3, 4];
  } else if (rec.pattern === 'weekly') {
    // Same weekday as startDate
    const jsDay = startDate.getUTCDay(); // 0=Sun
    activeDays = [jsDay === 0 ? 6 : jsDay - 1];
  } else {
    activeDays = rec.customDays ?? [0, 1, 2, 3, 4];
  }

  const maxCount = Math.min(rec.occurrences ?? 5, 60);
  const cutoff = rec.endType === 'end_date' && rec.endDate
    ? new Date(rec.endDate + 'T23:59:59Z')
    : null;

  const slots: Array<{ start: string; end: string }> = [];
  const cursor = new Date(startDate);
  let iterations = 0;

  while (slots.length < maxCount && iterations < 365) {
    iterations++;
    const jsDay = cursor.getUTCDay(); // 0=Sun
    const ourDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon

    if (activeDays.includes(ourDay)) {
      const slotStart = new Date(cursor);
      slotStart.setUTCHours(startH, startM, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      if (cutoff && slotStart > cutoff) break;

      slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}

// ─── P0 conflict check ────────────────────────────────────────────────────────
async function checkP0Conflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  owner_id: string,
  brand_id: string,
  startAt: string,
  endAt: string,
  excludeTaskId?: string
): Promise<{ type: 'employee' | 'brand'; task: Record<string, any> } | null> {
  const activeStatuses = ['scheduled', 'in_progress', 'pending', 'review', 'rework'];

  // Check 1: same employee already has an active P0 overlapping this window
  let empQ = supabase
    .from('tasks')
    .select('id, deliverable, status, priority, start_date, deadline, brands(id, name), owner:people!tasks_owner_id_fkey(id, name)')
    .eq('owner_id', owner_id)
    .eq('priority', 'P0')
    .in('status', activeStatuses)
    .lt('start_date', endAt)
    .gt('deadline', startAt);

  if (excludeTaskId) empQ = empQ.neq('id', excludeTaskId);
  const { data: empConflicts } = await empQ;

  if (empConflicts && empConflicts.length > 0) {
    return { type: 'employee', task: empConflicts[0] as any };
  }

  // Check 2: same brand already has an active P0 overlapping this window
  let brandQ = supabase
    .from('tasks')
    .select('id, deliverable, status, priority, start_date, deadline, brands(id, name), owner:people!tasks_owner_id_fkey(id, name)')
    .eq('brand_id', brand_id)
    .eq('priority', 'P0')
    .in('status', activeStatuses)
    .lt('start_date', endAt)
    .gt('deadline', startAt);

  if (excludeTaskId) brandQ = brandQ.neq('id', excludeTaskId);
  const { data: brandConflicts } = await brandQ;

  if (brandConflicts && brandConflicts.length > 0) {
    return { type: 'brand', task: brandConflicts[0] as any };
  }

  return null;
}

// ─── Conflict check (shared helper) ──────────────────────────────────────────
async function checkConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  owner_id: string,
  startAt: string,
  endAt: string,
  excludeTaskId?: string
): Promise<string | null> {
  let q = supabase
    .from('blocks')
    .select('id, start_at, end_at, task_id')
    .eq('person_id', owner_id)
    .lt('start_at', endAt)
    .gt('end_at', startAt);

  if (excludeTaskId) q = q.neq('task_id', excludeTaskId);

  const { data: overlapping } = await q;
  if (!overlapping || overlapping.length === 0) return null;

  const taskIds = overlapping.map((b: any) => b.task_id).filter(Boolean);
  const { data: conflictTasks } = taskIds.length > 0
    ? await supabase.from('tasks').select('id, deliverable, status, brands(name)').in('id', taskIds)
    : { data: [] };

  const activeTasks = (conflictTasks ?? []).filter(
    (t: any) => !['done', 'approved', 'cancelled'].includes(t.status)
  );

  if (activeTasks.length === 0) return null;

  const block = overlapping.find((b: any) => b.task_id === (activeTasks[0] as any).id) as any;
  const existingTask = (activeTasks[0] as any).deliverable ?? 'another task';
  const existingBrand = (activeTasks[0] as any).brands?.name ?? '';
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleString('en-IN', { ...opts, timeZone: 'UTC' });
  const dateStr = fmt(block.start_at, { day: 'numeric', month: 'short', weekday: 'short' });
  const timeStr = `${fmt(block.start_at, { hour: '2-digit', minute: '2-digit', hour12: true })} – ${fmt(block.end_at, { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  return `Conflict on ${dateStr}, ${timeStr}: "${existingTask}"${existingBrand ? ` (${existingBrand})` : ''} is already blocked.`;
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, name, access_tier, is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person) return NextResponse.json({ error: 'Person not found.' }, { status: 403 });

  const tier = (person as any).access_tier ?? 'staff';
  const isStaff = tier === 'staff' || tier === 'viewer' || tier === 'operations';

  const body = await req.json();
  const { brand_id, owner_id, reviewer_id, deliverable, task_type, task_name, priority, start_date, deadline, notes, recurrence, force, flexible } = body;

  if (!brand_id || !owner_id || !deliverable || !task_type) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  if (isStaff && owner_id !== person.id) {
    return NextResponse.json({ error: 'Staff can only create tasks for themselves.' }, { status: 403 });
  }

  // ── Calculate hours from start/end ──────────────────────────────────────
  let estimated_hours: number | null = null;
  let startAt: string | null = null;
  let endAt: string | null = null;

  if (start_date && deadline) {
    // For flexible tasks, anchor deadline to end of selected day, start to beginning — no timezone conversion
    const resolvedDeadline = flexible
      ? `${deadline.slice(0, 10)}T23:59:59Z`
      : deadline;
    const resolvedStart = flexible
      ? `${start_date.slice(0, 10)}T00:00:00Z`
      : start_date;

    const startMs = new Date(resolvedStart).getTime();
    const endMs = new Date(resolvedDeadline).getTime();
    if (!flexible && endMs <= startMs) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
    }
    estimated_hours = flexible ? null : Math.round(((endMs - startMs) / 3600000) * 10) / 10;
    startAt = resolvedStart;
    endAt = resolvedDeadline;
  }

  // ── P0 conflict gate ────────────────────────────────────────────────────
  if (priority === 'P0' && !force && startAt && endAt) {
    const p0Hit = await checkP0Conflict(supabase, owner_id, brand_id, startAt, endAt);
    if (p0Hit) {
      const t = p0Hit.task as any;
      const fmt = (iso: string | null, opts: Intl.DateTimeFormatOptions) =>
        iso ? new Date(iso).toLocaleString('en-IN', { ...opts, timeZone: 'UTC' }) : '—';
      return NextResponse.json({
        warning: true,
        conflict_type: p0Hit.type,
        conflicting_task: {
          id: t.id,
          deliverable: t.deliverable,
          brand: (t.brands as any)?.name ?? null,
          owner: (t.owner as any)?.name ?? null,
          start: t.start_date
            ? fmt(t.start_date, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
            : null,
          end: t.deadline
            ? fmt(t.deadline, { hour: '2-digit', minute: '2-digit', hour12: true })
            : null,
        },
      }, { status: 409 });
    }
  }

  // ── Recurring path ───────────────────────────────────────────────────────
  if (recurrence && startAt && endAt) {
    const slots = generateSlots(startAt, endAt, recurrence as RecurrenceConfig);

    if (slots.length === 0) {
      return NextResponse.json({ error: 'No valid slots found for the selected recurrence pattern.' }, { status: 400 });
    }

    // Check conflicts for ALL slots before creating anything
    for (const slot of slots) {
      const conflict = await checkConflict(supabase, owner_id, slot.start, slot.end);
      if (conflict) {
        return NextResponse.json({ error: conflict }, { status: 409 });
      }
    }

    // Last slot's end = task deadline
    const lastSlot = slots[slots.length - 1];
    const taskDeadline = lastSlot.end;
    const totalHours = Math.round(estimated_hours! * slots.length * 10) / 10;

    const patternLabel = recurrence.pattern === 'custom'
      ? (recurrence.customDays ?? []).map((d: number) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')
      : { weekdays: 'Weekdays', daily: 'Daily', weekly: 'Weekly' }[recurrence.pattern as string] ?? recurrence.pattern;
    const recLabel = `${patternLabel} · ${slots.length} occurrences`;

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
        estimated_hours: totalHours,
        status: 'scheduled',
        start_date: start_date || null,
        deadline: taskDeadline,
        notes: notes ? `${notes}\n\nRecurring: ${recLabel}` : `Recurring: ${recLabel}`,
      })
      .select('id')
      .single();

    if (error || !task) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

    // Bulk-insert all blocks
    const blockRows = slots.map(s => ({
      task_id: task.id,
      person_id: owner_id,
      start_at: s.start,
      end_at: s.end,
      status: 'scheduled',
    }));
    await supabase.from('blocks').insert(blockRows);

    await supabase.from('activity_log').insert({
      actor_id: person.id,
      action: 'task_created',
      task_id: task.id,
      details: { deliverable, owner_id, priority, recurring: true, occurrences: slots.length },
    });

    const [{ data: brandData }, { data: ownerData }, { data: assignerData }] = await Promise.all([
      supabase.from('brands').select('name').eq('id', brand_id).maybeSingle(),
      supabase.from('people').select('name').eq('id', owner_id).maybeSingle(),
      supabase.from('people').select('name').eq('id', person.id).maybeSingle(),
    ]);

    await notifySlack(
      `🔁 *Recurring task assigned* — ${ownerData?.name ?? 'Someone'} · *${brandData?.name ?? ''}* · "${deliverable}" · ${priority} · ${recLabel} · ${totalHours}h total · Assigned by ${assignerData?.name ?? 'lead'}`
    );

    return NextResponse.json({ id: task.id, recurring: true, occurrences: slots.length });
  }

  // ── Single task path ─────────────────────────────────────────────────────
  if (!flexible && startAt && endAt) {
    const conflict = await checkConflict(supabase, owner_id, startAt, endAt);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
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
      estimated_hours: flexible ? null : estimated_hours,
      status: 'scheduled',
      start_date: start_date || null,
      deadline: deadline || null,
      notes: notes || null,
      flexible: flexible || false,
    })
    .select('id')
    .single();

  if (error || !task) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  // Only create a block for non-flexible tasks
  if (!flexible && startAt && endAt) {
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
