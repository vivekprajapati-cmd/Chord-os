import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ClientPortalHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id, brands(name)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount) redirect('/client/login');

  const brand = (clientAccount as any).brands as { name: string } | null;

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--f-display)',
        fontSize: '48px',
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        marginBottom: '8px',
      }}>
        Welcome{brand?.name ? `, ${brand.name}` : ''}
      </h1>
      <p style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--gray)',
        marginBottom: '40px',
      }}>
        Your project portal
      </p>

      {/* Placeholder — Phase 3 will add real sections */}
      <div style={{
        background: 'var(--paper)',
        border: '1.5px solid var(--ink)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '6px 6px 0 var(--ink)',
      }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)' }}>
          Project overview coming soon
        </p>
      </div>
    </div>
  );
}
