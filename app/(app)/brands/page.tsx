import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import BrandsClient from './brands-client';

export default async function BrandsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: person } = await supabase.from('people').select('access_tier').eq('email', user?.email ?? '').maybeSingle();
  const tier = (person as any)?.access_tier ?? 'staff';
  const isLead = tier === 'admin' || tier === 'lead';
  const isAdminOrOps = tier === 'admin' || tier === 'operations';

  const { data: brands } = await supabase
    .from('brands')
    .select('id, slug, name, category, tier, status')
    .order('name');

  let clientAccounts: { id: string; email: string; is_active: boolean; brand_id: string }[] = [];
  if (isAdminOrOps) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('client_accounts')
      .select('id, email, is_active, brand_id')
      .order('created_at');
    clientAccounts = data ?? [];
  }

  return (
    <BrandsClient
      brands={brands ?? []}
      isLead={isLead}
      isAdminOrOps={isAdminOrOps}
      clientAccounts={clientAccounts}
    />
  );
}
