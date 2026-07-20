import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person?.is_team_lead) {
    return NextResponse.json({ error: 'Only team leads can edit brands.' }, { status: 403 });
  }

  const { id, category, tier, voice_summary, colors, typography, ops_tracker_sheet_id } = await req.json();

  const admin = createAdminClient();
  const { error } = await admin
    .from('brands')
    .update({ category, tier, voice_summary, colors, typography, ops_tracker_sheet_id })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logActivity({
    actor_name: user.email!,
    actor_email: user.email!,
    action: 'brand.edit',
    entity_type: 'brand',
    entity_id: id,
    description: `Brand edited`,
    metadata: { category, tier },
  });

  return NextResponse.json({ ok: true });
}
