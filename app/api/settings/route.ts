import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return NextResponse.json({ value: (data as any)?.value ?? null });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase.from('people').select('access_tier').eq('email', user.email!).maybeSingle();
  if ((person as any)?.access_tier !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  return NextResponse.json({ ok: true });
}
