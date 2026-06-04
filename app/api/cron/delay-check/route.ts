// Daily delay check — called by Vercel Cron at 9am IST (3:30am UTC)
// Add to vercel.json: { "crons": [{ "path": "/api/cron/delay-check", "schedule": "30 3 * * *" }] }

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifySlack } from '@/lib/slack';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Find all active tasks past their deadline with no submission
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, deliverable, deadline, delay_count, submitted_at, owner:people!tasks_owner_id_fkey(id, name), brands(name)')
    .in('status', ['scheduled', 'in_progress'])
    .lt('deadline', now.toISOString())
    .is('submitted_at', null);

  if (!overdueTasks || overdueTasks.length === 0) {
    return NextResponse.json({ ok: true, delayed: 0 });
  }

  const delayUpdates: Promise<unknown>[] = [];
  const ownerDelayMap: Record<string, { name: string; count: number }> = {};

  for (const task of overdueTasks as any[]) {
    const daysLate = Math.floor((now.getTime() - new Date(task.deadline).getTime()) / 86400000);
    const newDelayCount = (task.delay_count ?? 0) + 1;

    // Update delay count on task
    delayUpdates.push(
      Promise.resolve(supabase.from('tasks').update({ delay_count: newDelayCount }).eq('id', task.id))
    );

    // Fire Slack for each delayed task
    delayUpdates.push(
      notifySlack(`⚠️ *Delayed* — "${task.deliverable}" (${task.brands?.name}) assigned to *${task.owner?.name}* is ${daysLate} day${daysLate !== 1 ? 's' : ''} overdue. No submission yet.`)
    );

    // Accumulate per-owner delay count for repeat warning
    const ownerId = task.owner?.id;
    if (ownerId) {
      ownerDelayMap[ownerId] = {
        name: task.owner.name,
        count: (ownerDelayMap[ownerId]?.count ?? 0) + 1,
      };
    }
  }

  await Promise.all(delayUpdates);

  // Check repeat delays — anyone with 3+ delays in last 30 days
  const since30d = new Date(now.getTime() - 30 * 86400000).toISOString();
  for (const [ownerId, { name }] of Object.entries(ownerDelayMap)) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('on_time', false)
      .gte('created_at', since30d)
      .then(r => ({ count: r.count ?? 0 }));

    if (count >= 3) {
      await notifySlack(`🚨 *Repeat delay* — *${name}* has accumulated ${count} delays in the last 30 days. Flag for review.`);
    }
  }

  // Check tasks due in 24 hours — send reminder
  const in24h = new Date(now.getTime() + 24 * 3600000).toISOString();
  const { data: upcomingTasks } = await supabase
    .from('tasks')
    .select('id, deliverable, deadline, submitted_at, owner:people!tasks_owner_id_fkey(name), brands(name)')
    .in('status', ['scheduled', 'in_progress'])
    .gte('deadline', now.toISOString())
    .lte('deadline', in24h)
    .is('submitted_at', null);

  if (upcomingTasks && upcomingTasks.length > 0) {
    for (const task of upcomingTasks as any[]) {
      await notifySlack(`⏰ *Due in 24h* — "${task.deliverable}" (${task.brands?.name}) assigned to *${task.owner?.name}* is due tomorrow. Submit before deadline.`);
    }
  }

  return NextResponse.json({
    ok: true,
    delayed: overdueTasks.length,
    reminders: upcomingTasks?.length ?? 0,
  });
}
