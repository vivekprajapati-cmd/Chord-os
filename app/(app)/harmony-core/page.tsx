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

  // Fetch all people who have harmony assignments (the 6 tracked leads)
  const { data: people } = await admin
    .from('people')
    .select('id, name, role, access_tier')
    .in('id', (
      await admin.from('harmony_brand_assignments').select('person_id')
    ).data?.map((r: any) => r.person_id) ?? []);

  return (
    <HarmonyCoreClient
      me={me as any}
      people={(people ?? []) as any[]}
    />
  );
}
