import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthedPerson, canAccessHarmony } from '@/lib/supabase/get-authed-person';

export const runtime = 'nodejs';

// GET /api/harmony-core/assignments — fetch all brands + all people with harmony assignments
export async function GET() {
  const { person, unauth } = await getAuthedPerson();
  if (unauth) return unauth;
  if (!canAccessHarmony(person as any)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

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
  const { person: me, unauth } = await getAuthedPerson('access_tier');
  if (unauth) return unauth;

  if ((me as any)?.access_tier !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { person_id, brand_id, role_type, action } = await req.json();
  if (!person_id || !brand_id) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const admin = createAdminClient();

  if (action === 'unassign') {
    await admin
      .from('harmony_brand_assignments')
      .delete()
      .eq('person_id', person_id)
      .eq('brand_id', brand_id);
  } else {
    await admin
      .from('harmony_brand_assignments')
      .upsert({ person_id, brand_id, role_type }, { onConflict: 'person_id,brand_id' });
  }

  return NextResponse.json({ ok: true });
}
