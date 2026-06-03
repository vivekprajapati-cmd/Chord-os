import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ChatClient from './chat-client';

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('is_team_lead')
    .eq('email', user?.email ?? '')
    .maybeSingle();

  if (!person?.is_team_lead) redirect('/dashboard');

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-5xl uppercase tracking-tight">Allocator</h1>
        <div style={{ background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: '16px', padding: '40px', boxShadow: '6px 6px 0 var(--coral)', maxWidth: '560px' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
            Setup required
          </p>
          <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>
            Add your Anthropic API key to activate the allocator.
          </p>
          <div style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--ink)', marginBottom: '20px' }}>
            <p style={{ color: 'var(--gray)', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>.env.local</p>
            ANTHROPIC_API_KEY=sk-ant-...
          </div>
          <ol style={{ paddingLeft: '16px', color: 'var(--gray)', fontSize: '13px', lineHeight: 1.7, fontFamily: 'var(--f-mono)' }}>
            <li>Get a key at console.anthropic.com</li>
            <li>Add it to <code>.env.local</code> in the project root</li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    );
  }

  return <ChatClient />;
}
