import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import NpsClient from './nps-client';

export default async function NpsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('people').select('id, access_tier').eq('email', user.email!).maybeSingle();
  const isAdmin = (me as any)?.access_tier === 'admin';

  const admin = createAdminClient();
  const { data: brand } = await admin.from('brands').select('id, name, slug').eq('slug', slug).maybeSingle();
  if (!brand) redirect('/brands');

  return <NpsClient brand={brand as any} isAdmin={isAdmin} />;
}
