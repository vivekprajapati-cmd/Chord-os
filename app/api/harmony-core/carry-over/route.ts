import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// POST /api/harmony-core/carry-over
// body: { person_id, from_month, to_month }
// Computes remaining scope from from_month and adds it as backlog in to_month.
// Only sets backlog if to_month entry doesn't already have a scope value (i.e. fresh month).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('people').select('access_tier').eq('email', user.email!).maybeSingle();
  if ((me as any)?.access_tier !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { person_id, from_month, to_month } = await req.json();
  if (!person_id || !from_month || !to_month) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const admin = createAdminClient();

  const { data: fromEntries } = await admin
    .from('harmony_core_monthly')
    .select('*')
    .eq('person_id', person_id)
    .eq('month', from_month);

  if (!fromEntries?.length) return NextResponse.json({ carried: 0 });

  let carried = 0;
  for (const entry of fromEntries) {
    const m = entry.metrics ?? {};
    const remaining = Math.max(0, (Number(m.scope) || 0) - (Number(m.tasks_completed) || 0));
    if (remaining === 0) continue;

    // Check if to_month entry already exists with a scope set
    const { data: existing } = await admin
      .from('harmony_core_monthly')
      .select('metrics')
      .eq('person_id', person_id)
      .eq('brand_id', entry.brand_id)
      .eq('month', to_month)
      .maybeSingle();

    const existingMetrics = existing?.metrics ?? {};
    const newBacklog = (Number(existingMetrics.backlog) || 0) + remaining;

    await admin.from('harmony_core_monthly').upsert(
      {
        person_id,
        brand_id: entry.brand_id,
        month: to_month,
        role_type: entry.role_type,
        metrics: { ...existingMetrics, backlog: newBacklog },
        tracker_logs: existing ? undefined : { orm: [], ops: [], social: [] },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'person_id,brand_id,month' }
    );
    carried++;
  }

  return NextResponse.json({ carried });
}
