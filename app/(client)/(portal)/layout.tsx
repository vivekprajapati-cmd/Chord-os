import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id, is_active, brands(name)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount || !clientAccount.is_active) redirect('/client/login');

  const brand = (clientAccount as any).brands as { name: string } | null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1.5px solid var(--ink)',
        padding: '0 32px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--paper)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: '20px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            Chord
          </p>
          {brand?.name && (
            <>
              <span style={{ color: 'var(--gray)', fontSize: '14px' }}>/</span>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)' }}>
                {brand.name}
              </p>
            </>
          )}
        </div>
        <form action="/api/client/auth/logout" method="POST">
          <button type="submit" style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            padding: '6px 14px',
            cursor: 'pointer',
            color: 'var(--gray)',
          }}>
            Sign out
          </button>
        </form>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '960px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
