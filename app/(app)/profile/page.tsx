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

  return (
    <ProfileClient
      person={{
        id: person?.id ?? '',
        name: person?.name ?? '',
        email: user.email ?? '',
        role: person?.role ?? '',
        department: person?.department ?? '',
        seniority: (person as any)?.seniority ?? '',
        location: (person as any)?.location ?? '',
        access_tier: (person as any)?.access_tier ?? 'staff',
      }}
      managerName={managerName}
    />
  );
}
