import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const person_id = searchParams.get('person_id');
  const week_start = searchParams.get('week_start'); // YYYY-MM-DD Monday

  if (!person_id || !week_start) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch current week + previous week for delta calculation
  const prevWeek = new Date(week_start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prev_week_start = prevWeek.toISOString().split('T')[0];

  const { data: entries } = await admin
    .from('harmony_core_weekly')
    .select('*')
    .eq('person_id', person_id)
    .in('week_start', [week_start, prev_week_start]);

  return NextResponse.json({ entries: entries ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const body = await req.json();
  const { person_id, brand_id, week_start, followers, er, sov, profile_visits, avg_vtr } = body;

  if ((me as any)?.access_tier !== 'admin' && (me as any)?.id !== person_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('harmony_core_weekly')
    .upsert(
      { person_id, brand_id, week_start, followers, er, sov, profile_visits, avg_vtr, updated_at: new Date().toISOString() },
      { onConflict: 'person_id,brand_id,week_start' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
