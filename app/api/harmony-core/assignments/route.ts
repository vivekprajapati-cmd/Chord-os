import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyHarmonySlack } from '@/lib/slack';

export const runtime = 'nodejs';

// GET /api/harmony-core/assignments — fetch all brands + all people with harmony assignments
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const [{ data: brands }, { data: people }] = await Promise.all([
    admin.from('brands').select('id, name').order('name'),
    admin.from('people').select('id, name').order('name'),
  ]);

  return NextResponse.json({ brands: brands ?? [], people: people ?? [] });
}

// POST /api/harmony-core/assignments — upsert or delete an assignment
// body: { person_id, brand_id, role_type, action: 'assign' | 'unassign' }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('people')
    .select('access_tier, harmony_core_enabled')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const isAdmin = me?.access_tier === 'admin';
  const isHarmonyUser = (me as any)?.harmony_core_enabled === true;

  if (!isAdmin && !isHarmonyUser) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { person_id, brand_id, role_type, action } = await req.json();
  if (!person_id || !brand_id) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const admin = createAdminClient();

  // Non-admin harmony users can only assign to harmony_core_enabled people
  if (!isAdmin) {
    const { data: target } = await admin.from('people').select('harmony_core_enabled').eq('id', person_id).maybeSingle();
    if (!target?.harmony_core_enabled) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const [{ data: person }, { data: brand }] = await Promise.all([
    admin.from('people').select('name').eq('id', person_id).maybeSingle(),
    admin.from('brands').select('name').eq('id', brand_id).maybeSingle(),
  ]);

  if (action === 'unassign') {
    await admin
      .from('harmony_brand_assignments')
      .delete()
      .eq('person_id', person_id)
      .eq('brand_id', brand_id);
    notifyHarmonySlack(`${person?.name ?? person_id} unassigned from ${brand?.name ?? brand_id}`);
  } else {
    await admin
      .from('harmony_brand_assignments')
      .upsert({ person_id, brand_id, role_type }, { onConflict: 'person_id,brand_id' });
    notifyHarmonySlack(`${person?.name ?? person_id} assigned to ${brand?.name ?? brand_id}`);
  }

  return NextResponse.json({ ok: true });
}
