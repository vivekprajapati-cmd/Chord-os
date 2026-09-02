import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// GET /api/harmony-core/history?person_id=X&months=6
// Returns last N months of aggregated totals (scope, tasks_completed, backlog, backlog_completed)
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const person_id = searchParams.get('person_id');
  const months = Math.min(12, Number(searchParams.get('months') ?? '6'));

  if (!person_id) return NextResponse.json({ error: 'missing person_id' }, { status: 400 });

  const { data: me } = await supabase.from('people').select('id, access_tier').eq('email', user.email!).maybeSingle();
  const isPrivileged = (me as any)?.access_tier === 'admin' || (me as any)?.access_tier === 'operations';
  if (!isPrivileged && (me as any)?.id !== person_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Fetch ALL social entries for this person, any month
  const { data: entries } = await admin
    .from('harmony_core_monthly')
    .select('month, metrics')
    .eq('person_id', person_id)
    .eq('role_type', 'social')
    .order('month', { ascending: true });

  // Aggregate per month — only months with actual data
  const byMonth: Record<string, { scope: number; done: number; backlog: number; backlog_done: number }> = {};
  for (const e of entries ?? []) {
    const m = e.metrics ?? {};
    if (!byMonth[e.month]) byMonth[e.month] = { scope: 0, done: 0, backlog: 0, backlog_done: 0 };
    byMonth[e.month].scope += Number(m.scope) || 0;
    byMonth[e.month].done += Number(m.tasks_completed) || 0;
    byMonth[e.month].backlog += Number(m.backlog) || 0;
    byMonth[e.month].backlog_done += Number(m.backlog_completed) || 0;
  }

  const result = Object.keys(byMonth).sort().map(m => ({
    month: m,
    label: new Date(m + 'T00:00:00').toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    ...byMonth[m],
  }));

  return NextResponse.json({ history: result });
}
