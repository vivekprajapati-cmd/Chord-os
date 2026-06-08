import { createClient } from '@/lib/supabase/server';
import OperationsClient from './operations-client';

export default async function OperationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, access_tier')
    .eq('email', user!.email!)
    .maybeSingle();

  const isAdmin = (person as any)?.access_tier === 'admin';

  const { data: links } = await supabase
    .from('ops_links')
    .select('id, title, url, sort_order')
    .order('sort_order', { ascending: true });

  return (
    <OperationsClient
      initialLinks={(links ?? []) as { id: string; title: string; url: string; sort_order: number }[]}
      isAdmin={isAdmin}
    />
  );
}
