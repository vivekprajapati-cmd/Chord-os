import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import HRFeedbackClient from './hr-feedback-client';

export default async function HRFeedbackPage() {
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
  if (tier !== 'admin' && tier !== 'hr') redirect('/dashboard');

  const personId = self?.id ?? '';

  const [{ data: allPeople }, { data: pending }, { data: recent }] = await Promise.all([
    admin.from('people').select('id, name, role, department').order('name'),
    admin.from('feedback').select('id, period, content, hr_notes, status, created_at, people!feedback_person_id_fkey(name), submitter:people!feedback_submitted_by_fkey(name)').eq('status', 'pending_hr').order('created_at', { ascending: false }),
    admin.from('feedback').select('id, period, content, hr_notes, status, created_at, published_at, people!feedback_person_id_fkey(name), submitter:people!feedback_submitted_by_fkey(name)').eq('status', 'published').order('published_at', { ascending: false }).limit(10),
  ]);

  return (
    <HRFeedbackClient
      selfId={personId}
      allPeople={(allPeople ?? []) as any[]}
      pendingFeedback={(pending ?? []) as any[]}
      recentPublished={(recent ?? []) as any[]}
    />
  );
}
