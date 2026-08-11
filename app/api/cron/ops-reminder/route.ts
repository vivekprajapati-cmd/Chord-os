// Ops team task assignment reminder — called by cronjob.org at 10:30 AM IST (5:00 AM UTC)
// Register on cronjob.org: GET /api/cron/ops-reminder with Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server';
import { notifySlack } from '@/lib/slack';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await notifySlack(`🗂 Good morning, ops team. 10:30 AM — time to assign today's tasks in Harmony.`);

  return NextResponse.json({ ok: true });
}
