import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: Request) {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, role, department, seniority, location } = body;

  // Use admin client to bypass RLS — safe because we verify auth above
  const admin = createAdminClient();
  const { error } = await admin
    .from('people')
    .update({ name, role, department, seniority, location })
    .eq('email', user.email!);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
