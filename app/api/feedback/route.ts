import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: self } = await admin
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (self as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'hr') {
    return NextResponse.json({ error: 'Only HR and admin can submit feedback' }, { status: 403 });
  }

  const { person_id, period, content } = await req.json();
  if (!person_id || !period?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'person_id, period and content are required' }, { status: 400 });
  }

  const { data: feedback, error } = await admin
    .from('feedback')
    .insert({ person_id, submitted_by: self!.id, period: period.trim(), content: content.trim(), status: 'pending_hr' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: self } = await admin
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (self as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'hr') {
    return NextResponse.json({ error: 'Only HR and admin can publish feedback' }, { status: 403 });
  }

  const { id, hr_notes } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data: feedback, error } = await admin
    .from('feedback')
    .update({ hr_notes: hr_notes?.trim() ?? null, status: 'published', published_by: self!.id, published_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback });
}
