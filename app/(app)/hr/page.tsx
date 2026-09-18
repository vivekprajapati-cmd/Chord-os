import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getAuthedPerson } from '@/lib/supabase/get-authed-person';
import HRClient from './hr-client';

export default async function HRPage() {
  const { person: self, unauth } = await getAuthedPerson('access_tier');
  if (unauth) redirect('/login');

  const tier = (self as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'hr') redirect('/dashboard');

  const admin = createAdminClient();

  // pending leaves count — graceful if table doesn't exist yet
  let pendingLeaves = 0;
  try {
    const { count } = await admin
      .from('leaves')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingLeaves = count ?? 0;
  } catch {}

  // recent activity — combine leaves + feedback, graceful fallback
  let activity: { type: string; person: string; status: string; time: string }[] = [];
  try {
    const { data: leaves } = await admin
      .from('leaves')
      .select('type, status, created_at, people(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (leaves) {
      activity = leaves.map((l: any) => ({
        type: 'leave',
        person: l.people?.name ?? 'Unknown',
        status: l.status,
        time: new Date(l.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      }));
    }
  } catch {}

  return <HRClient pendingLeaves={pendingLeaves} activity={activity} />;
}
