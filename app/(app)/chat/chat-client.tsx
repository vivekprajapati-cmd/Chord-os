'use client';

import { useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? 'No reply' }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <h1 className="font-display text-5xl uppercase tracking-tight mb-2">Allocator</h1>
      <p className="text-sm text-[var(--gray)] mb-6 font-mono">
        Type to allocate. Example: "Block Vineet 3 hrs tomorrow for IndiaGate video edit, P1."
      </p>

      <div className="flex-1 overflow-y-auto bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-[var(--gray)] text-sm">No messages yet. Start by telling me what to schedule.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className="inline-block max-w-2xl px-4 py-2 rounded-lg text-sm"
              style={m.role === 'user'
                ? { background: 'var(--ink)', color: 'var(--cream)' }
                : { background: 'var(--cream-2)' }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-[var(--gray)] text-sm">Thinking…</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Block Vineet 3 hrs tomorrow for IndiaGate edit, P1"
          className="flex-1 bg-[var(--paper)] border border-[var(--line)] rounded-full px-5 py-3 text-sm focus:outline-none focus:border-[var(--ink)]"
        />
        <button
          onClick={send}
          disabled={loading}
          className="uppercase tracking-[0.12em] text-xs font-mono px-6 rounded-full hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--ink)', color: 'var(--cream)' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
