import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ClientBrandHQPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount) redirect('/client/login');

  const { data: brand } = await supabase
    .from('brands')
    .select('name, colors, typography, voice_summary')
    .eq('id', clientAccount.brand_id)
    .maybeSingle();

  if (!brand) redirect('/client');

  const colors = (brand.colors ?? {}) as Record<string, string>;
  const typography = (brand.typography ?? {}) as Record<string, string>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '44px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '4px' }}>
        Brand HQ
      </h1>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '32px' }}>
        Your brand identity reference
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Brand Colors */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px', boxShadow: '4px 4px 0 var(--ink)' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '16px' }}>Brand Colors</p>
          {Object.keys(colors).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {Object.entries(colors).map(([name, hex]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: hex, border: '1px solid var(--line)' }} />
                  <div>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 600 }}>{hex}</p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--gray)' }}>{name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--gray)' }}>Not set yet.</p>
          )}
        </div>

        {/* Typography */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px', boxShadow: '4px 4px 0 var(--ink)' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '16px' }}>Typography</p>
          {Object.keys(typography).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(typography).map(([role, font]) => (
                <div key={role} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--gray)', width: '100px', flexShrink: 0 }}>{role}</p>
                  <p style={{ fontSize: '15px', fontWeight: 500 }}>{font}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--gray)' }}>Not set yet.</p>
          )}
        </div>

        {/* Voice & Tone */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px', boxShadow: '4px 4px 0 var(--ink)' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '16px' }}>Voice & Tone</p>
          {brand.voice_summary ? (
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--ink)' }}>{brand.voice_summary}</p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--gray)' }}>Not set yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
