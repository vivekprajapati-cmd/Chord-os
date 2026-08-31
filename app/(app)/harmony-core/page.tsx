import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import HarmonyCoreClient from './harmony-core-client';

export default async function HarmonyCorePageWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('people')
    .select('id, name, access_tier, role')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (me as any)?.access_tier;
  if (!['admin', 'lead', 'operations', 'staff'].includes(tier)) redirect('/dashboard');

  const admin = createAdminClient();

  const HARMONY_NAMES = ['Atharva', 'Trupti', 'Aakanksha', 'Richa', 'Arbaaz', 'Pierre'];
  const { data: people } = await admin
    .from('people')
    .select('id, name, role, access_tier')
    .in('name', HARMONY_NAMES)
    .order('name');

  return (
    <HarmonyCoreClient
      me={me as any}
      people={(people ?? []) as any[]}
    />
  );
}
