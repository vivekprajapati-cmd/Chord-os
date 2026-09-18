import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthedPerson } from '@/lib/supabase/get-authed-person';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { person, unauth } = await getAuthedPerson();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const person_id = searchParams.get('person_id');
  const month = searchParams.get('month'); // YYYY-MM-01

  if (!person_id || !month) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const isPrivileged = ['admin', 'lead', 'operations'].includes((person as any)?.access_tier);
  if (!isPrivileged && (person as any)?.id !== person_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: assignments } = await admin
    .from('harmony_brand_assignments')
    .select('brand_id, role_type, brands(id, name)')
    .eq('person_id', person_id);

  const brandIds = (assignments ?? []).map((a: any) => a.brand_id);

  const { data: entries } = await admin
    .from('harmony_core_monthly')
    .select('*')
    .eq('person_id', person_id)
    .eq('month', month);

  return NextResponse.json({ assignments: assignments ?? [], entries: entries ?? [] });
}

export async function POST(req: Request) {
  const { person: me, unauth } = await getAuthedPerson('id, access_tier');
  if (unauth) return unauth;

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
  return NextResponse.json({ data });
}
