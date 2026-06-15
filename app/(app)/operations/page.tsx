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

  const tier = (person as any)?.access_tier ?? 'staff';
  const isAdmin = tier === 'admin';
  const canManage = ['admin', 'lead', 'operations'].includes(tier);

  const [linksResult, brandsResult, docsResult] = await Promise.all([
    supabase
      .from('ops_links')
      .select('id, title, url, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('brands')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('brand_ops_docs')
      .select('id, brand_id, doc_type, month, week, link, file_path, created_at, brands(id, name, slug), uploaded_by:people!brand_ops_docs_uploaded_by_id_fkey(name)')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <OperationsClient
      initialLinks={(linksResult.data ?? []) as { id: string; title: string; url: string; sort_order: number }[]}
      isAdmin={isAdmin}
      canManage={canManage}
      brands={(brandsResult.data ?? []) as { id: string; name: string; slug: string }[]}
      initialDocs={(docsResult.data ?? []) as any[]}
      currentPersonId={person?.id ?? ''}
    />
  );
}
