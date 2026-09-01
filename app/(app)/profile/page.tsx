import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import ProfileClient from './profile-client';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: person } = await admin
    .from('people')
    .select('id, name, email, role, department, seniority, location, access_tier, manager_id')
    .eq('email', user.email!)
    .maybeSingle();

  let managerName: string | null = null;
  if ((person as any)?.manager_id) {
    const { data: mgr } = await admin
      .from('people')
      .select('name, role')
      .eq('id', (person as any).manager_id)
      .maybeSingle();
    managerName = mgr ? `${mgr.name}${mgr.role ? ` · ${mgr.role}` : ''}` : null;
  }

  const personId = person?.id ?? '';
  const year = new Date().getFullYear();

  let leaveBalance = { earned_total: 18, casual_total: 8, sick_total: 6, unpaid_total: 5 };
  let leaveHistory: { id: string; type: string; start_date: string; end_date: string; duration_days: number; reason: string | null; status: string; created_at: string }[] = [];
  let approvers: { id: string; name: string; role: string | null }[] = [];

  if (personId) {
    try {
      const { data: bal } = await admin
        .from('leave_balances')
        .select('earned_total, casual_total, sick_total, unpaid_total')
        .eq('person_id', personId)
        .eq('year', year)
        .maybeSingle();
      if (bal) leaveBalance = bal;
    } catch {}

    try {
      const { data: hist } = await admin
        .from('leaves')
        .select('id, type, start_date, end_date, duration_days, reason, status, created_at')
        .eq('person_id', personId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (hist) leaveHistory = hist;
    } catch {}

    // fetch people who can approve — managers and leads, excluding self
    try {
      const { data: approverList } = await admin
        .from('people')
        .select('id, name, role')
        .in('access_tier', ['admin', 'lead'])
        .neq('id', personId)
        .order('name');
      if (approverList) approvers = approverList;
    } catch {}
  }

  return (
    <ProfileClient
      person={{
        id: personId,
        name: person?.name ?? '',
        email: user.email ?? '',
        role: person?.role ?? '',
        department: person?.department ?? '',
        seniority: (person as any)?.seniority ?? '',
        location: (person as any)?.location ?? '',
        access_tier: (person as any)?.access_tier ?? 'staff',
      }}
      managerName={managerName}
      leaveBalance={leaveBalance}
      leaveHistory={leaveHistory}
      approvers={approvers}
    />
  );
}
