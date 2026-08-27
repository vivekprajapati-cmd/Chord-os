import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyHarmonySlack } from '@/lib/slack';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const person_id = searchParams.get('person_id');
  const month = searchParams.get('month'); // YYYY-MM-01

  if (!person_id || !month) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const admin = createAdminClient();

  const { data: rawAssignments } = await admin
    .rpc('get_harmony_assignments', { p_person_id: person_id });

  const assignments = (rawAssignments ?? []).map((r: any) => ({
    brand_id: r.brand_id,
    role_type: r.role_type,
    brands: { id: r.brand_id, name: r.brand_name },
  }));

  const { data: entries } = await admin
    .from('harmony_core_monthly')
    .select('*')
    .eq('person_id', person_id)
    .eq('month', month);

  return NextResponse.json({ assignments: assignments ?? [], entries: entries ?? [] });
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
  const { person_id, brand_id, month, role_type, metrics, tracker_logs } = body;

  // Only admin or the person themselves can write
  if ((me as any)?.access_tier !== 'admin' && (me as any)?.id !== person_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('harmony_core_monthly')
    .upsert(
      { person_id, brand_id, month, role_type, metrics, tracker_logs, updated_at: new Date().toISOString() },
      { onConflict: 'person_id,brand_id,month' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: personRow } = await admin.from('people').select('name').eq('id', person_id).maybeSingle();
  const { data: brandRow } = await admin.from('brands').select('name').eq('id', brand_id).maybeSingle();
  const monthLabel = new Date(month + 'T00:00:00').toLocaleString('en', { month: 'long', year: 'numeric' });
  notifyHarmonySlack(`${personRow?.name ?? person_id} updated ${brandRow?.name ?? brand_id} for ${monthLabel}`);

  return NextResponse.json({ data });
}
