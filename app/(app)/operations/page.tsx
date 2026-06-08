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

  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ops_embed_url')
    .maybeSingle();

  const embedUrl = (setting as any)?.value ?? '';

  return <OperationsClient initialUrl={embedUrl} isAdmin={isAdmin} />;
}
