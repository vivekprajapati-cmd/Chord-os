import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import FeedbackSubmitClient from './feedback-submit-client';

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: self } = await admin
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (self as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'lead') redirect('/dashboard');

  const personId = self?.id ?? '';

  // people they manage (manager_id = me) — who they can write feedback for
  const { data: reportees } = await admin
    .from('people')
    .select('id, name, role, department')
    .eq('manager_id', personId)
    .order('name');

  // feedback this person has already submitted
  const { data: submitted } = await admin
    .from('feedback')
    .select('id, period, content, status, created_at, people(name)')
    .eq('submitted_by', personId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <FeedbackSubmitClient
      reportees={(reportees ?? []) as { id: string; name: string; role: string | null; department: string | null }[]}
      submitted={(submitted ?? []) as any[]}
    />
  );
}
