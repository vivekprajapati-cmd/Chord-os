import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH — toggle is_active on a client account
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'operations') {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { is_active } = await req.json();
  if (typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active (boolean) required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('client_accounts')
    .update({ is_active })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, is_active });
}
