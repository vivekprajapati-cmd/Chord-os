'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ClientLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !user) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    const { data: clientAccount } = await supabase
      .from('client_accounts')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!clientAccount || !clientAccount.is_active) {
      await supabase.auth.signOut();
      setError('No active client account found for this email.');
      setLoading(false);
      return;
    }

    router.push('/client');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{
            fontFamily: 'var(--f-display)',
            fontSize: '32px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}>
            Chord
          </p>
          <p style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--gray)',
            marginTop: '4px',
          }}>
            Client Portal
          </p>
        </div>

        {/* Login card */}
        <div style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--ink)',
          borderRadius: '18px',
          boxShadow: '8px 8px 0 var(--ink)',
          padding: '32px',
        }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '6px' }}>
                Email
              </p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  background: 'var(--cream)',
                  border: '1px solid var(--ink)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '6px' }}>
                Password
              </p>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'var(--cream)',
                  border: '1px solid var(--ink)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                background: 'var(--ink)',
                color: 'var(--cream)',
                border: '1px solid var(--ink)',
                borderRadius: '999px',
                padding: '13px',
                fontFamily: 'var(--f-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
