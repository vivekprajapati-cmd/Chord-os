import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from('people')
    .update({ google_refresh_token: null, google_calendar_connected: false })
    .eq('email', user.email!);

  return NextResponse.json({ ok: true });
}
