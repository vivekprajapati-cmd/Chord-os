import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import HRLeavesClient from './hr-leaves-client';

export default async function HRLeavesPage() {
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

  const year = new Date().getFullYear();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [{ data: leaves }, { data: allPeople }, { data: balances }] = await Promise.all([
    admin
      .from('leaves')
      .select('id, type, start_date, end_date, duration_days, reason, status, created_at, person_id, approver_id, approved_by, people!leaves_person_id_fkey(name, role), approver:people!leaves_approver_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('people').select('id, name').order('name'),
    admin.from('leave_balances').select('person_id, planned_total, urgent_total, birthday_total').eq('year', year),
  ]);

  const leaveList = (leaves ?? []) as any[];

  // compute used days per person per type from approved leaves
  const usedMap: Record<string, Record<string, number>> = {};
  for (const l of leaveList) {
    if (l.status !== 'approved') continue;
    if (!usedMap[l.person_id]) usedMap[l.person_id] = { planned: 0, urgent: 0, birthday: 0 };
    usedMap[l.person_id][l.type] = (usedMap[l.person_id][l.type] ?? 0) + (l.duration_days ?? 1);
  }

  // stats
  const pending = leaveList.filter(l => l.status === 'pending').length;
  const approvedThisMonth = leaveList.filter(l => l.status === 'approved' && l.created_at >= monthStart).length;
  const rejected = leaveList.filter(l => l.status === 'rejected' && l.created_at >= monthStart).length;

  const balanceMap: Record<string, { planned_total: number; urgent_total: number; birthday_total: number }> = {};
  for (const b of balances ?? []) balanceMap[b.person_id] = b;

  return (
    <HRLeavesClient
      leaves={leaveList}
      allPeople={(allPeople ?? []) as { id: string; name: string }[]}
      balanceMap={balanceMap}
      usedMap={usedMap}
      stats={{ pending, approvedThisMonth, rejected }}
    />
  );
}
