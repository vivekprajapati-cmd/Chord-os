import { NextResponse } from 'next/server';
import { createClient } from './server';

/** Fetch the authed user + their people row in one call. Returns unauth response if not logged in. */
export async function getAuthedPerson(fields = 'id, access_tier, harmony_core_enabled') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { person: null, user: null, unauth: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  const { data: person } = await supabase
    .from('people')
    .select(fields)
    .eq('email', user.email!)
    .maybeSingle();
  return { person, user, unauth: null };
}

/** Returns true if the person can access Harmony Core (admin | lead | operations | harmony_core_enabled). */
export function canAccessHarmony(person: { access_tier: string; harmony_core_enabled?: boolean } | null) {
  if (!person) return false;
  return ['admin', 'lead', 'operations'].includes(person.access_tier) || !!person.harmony_core_enabled;
}
