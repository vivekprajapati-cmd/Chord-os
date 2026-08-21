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

  // Find all active tasks past their deadline with no submission (kept for triggers 1 & 3)
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, deliverable, deadline, delay_count, submitted_at, owner:people!tasks_owner_id_fkey(id, name), brands(name)')
    .in('status', ['scheduled', 'in_progress'])
    .lt('deadline', now.toISOString())
    .is('submitted_at', null);

  // Trigger 1 (mark overdue + Slack per task) — disabled for now
  // Trigger 3 (repeat delay warning) — disabled for now

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
    reminders: upcomingTasks?.length ?? 0,
  });
}
