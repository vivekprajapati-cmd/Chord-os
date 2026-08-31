import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractFormId } from '@/lib/google-forms';

export const runtime = 'nodejs';

// GET /api/nps-forms?brand_id=xxx — list forms for a brand
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const brand_id = new URL(req.url).searchParams.get('brand_id');
  if (!brand_id) return NextResponse.json({ error: 'brand_id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: forms } = await admin
    .from('nps_forms')
    .select('id, form_id, quarter, created_at')
    .eq('brand_id', brand_id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ forms: forms ?? [] });
}

// POST /api/nps-forms — add a form (admin only)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('people').select('access_tier').eq('email', user.email!).maybeSingle();
  if ((me as any)?.access_tier !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const { brand_id, form_url, quarter } = await req.json();
  if (!brand_id || !form_url || !quarter) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const form_id = extractFormId(form_url);
  if (!form_id) return NextResponse.json({ error: 'invalid form URL' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('nps_forms')
    .insert({ brand_id, form_id, quarter })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ form: data });
}

// DELETE /api/nps-forms?id=xxx — remove a form (admin only)
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('people').select('access_tier').eq('email', user.email!).maybeSingle();
  if ((me as any)?.access_tier !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('nps_forms').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
