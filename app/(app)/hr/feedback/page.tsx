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

  const [{ data: allPeople }, { data: allFeedback }] = await Promise.all([
    admin.from('people').select('id, name, role, department').order('name'),
    // latest published feedback per person — we fetch all then group in JS
    admin.from('feedback').select('id, person_id, period, rating, published_at').eq('status', 'published').order('published_at', { ascending: false }),
  ]);

  // Build per-person latest feedback map
  const latestFeedback: Record<string, { period: string; rating: number | null; published_at: string }> = {};
  for (const f of allFeedback ?? []) {
    if (!latestFeedback[f.person_id]) {
      latestFeedback[f.person_id] = { period: f.period, rating: f.rating, published_at: f.published_at };
    }
  }

  // Quarter stats
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const feedbackThisQuarter = new Set(
    (allFeedback ?? []).filter(f => new Date(f.published_at) >= qStart).map(f => f.person_id)
  );

  const people = (allPeople ?? []) as { id: string; name: string; role: string | null; department: string | null }[];

  return (
    <HRFeedbackClient
      people={people}
      latestFeedback={latestFeedback}
      stats={{
        total: people.length,
        givenThisQuarter: feedbackThisQuarter.size,
        pending: people.length - feedbackThisQuarter.size,
      }}
    />
  );
}
