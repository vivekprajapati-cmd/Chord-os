import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { getAuthedPerson } from '@/lib/supabase/get-authed-person';

export async function POST(req: Request) {
  const { person, unauth, user } = await getAuthedPerson('access_tier');
  if (unauth) return unauth;

  const personTier = (person as any)?.access_tier ?? 'staff';
  if (personTier !== 'admin' && personTier !== 'lead') {
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
