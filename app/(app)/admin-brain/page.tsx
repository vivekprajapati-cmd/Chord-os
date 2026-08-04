import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminBrainClient from './admin-brain-client';

export default async function AdminBrainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: person } = await supabase.from('people').select('access_tier').eq('email', user.email!).maybeSingle();
  if ((person as any)?.access_tier !== 'admin') redirect('/dashboard');

  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'backlog_sheet_url').maybeSingle();
  const sheetUrl = (setting as any)?.value ?? '';

  return <AdminBrainClient initialSheetUrl={sheetUrl} />;
}
