import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person?.is_team_lead) {
    return NextResponse.json({ error: 'Only team leads can add brands.' }, { status: 403 });
  }

  const { name, slug, category, tier } = await req.json();

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('brands').insert({
    name: name.trim(),
    slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
    category: category?.trim() ?? '',
    tier: tier ?? 'tier-2',
    status: 'active',
    colors: {},
    typography: {},
    knowledge: {},
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void logActivity({
    actor_name: user.email!,
    actor_email: user.email!,
    action: 'brand.create',
    entity_type: 'brand',
    description: `Brand "${name.trim()}" created`,
    metadata: { slug: slug.trim(), category, tier },
  });

  return NextResponse.json({ ok: true });
}
