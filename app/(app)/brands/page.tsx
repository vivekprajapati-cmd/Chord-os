import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BrandsClient from './brands-client';

export default async function BrandsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: person } = await supabase.from('people').select('is_team_lead, access_tier').eq('email', user?.email ?? '').maybeSingle();
  const isLead = !!person?.is_team_lead;
  const tier = (person as any)?.access_tier ?? 'staff';
  const isAdminOrOps = tier === 'admin' || tier === 'operations';

  const { data: brands } = await supabase
    .from('brands')
    .select('id, slug, name, category, tier, status')
    .order('name');

  return <BrandsClient brands={brands ?? []} isLead={isLead} isAdminOrOps={isAdminOrOps} />;
}
