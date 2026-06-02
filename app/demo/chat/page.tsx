'use client';

import { useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

// Keyword-matched smart replies for demo
function getReply(input: string): string {
  const t = input.toLowerCase();

  // Bulk allocation
  if ((t.includes('\n') || t.includes('morning') || t.includes('block:') || t.includes('everyone')) &&
    (t.includes('vineet') || t.includes('manan') || t.includes('dhwani'))) {
    return `Done. Morning block assigned:\n— Vineet: IndiaGate Reel edit (P1), 3h, due 8 Jun\n— Manan: AlphaKid script (P1), 2h, due 9 Jun\n— Dhwani: Vadilal social posts (P2), 4h, due 10 Jun\nSlack notified for all 3.`;
  }

  // Reassign
  if (t.includes('reassign') || t.includes('move') || t.includes('give') || t.includes('swap')) {
    const names = ['vineet', 'manan', 'dhwani', 'tarun', 'pratik', 'kuldip', 'pierre'];
    const toName = names.find(n => t.includes(n) && !t.startsWith(n)) ?? 'Tarun';
    const fromName = names.find(n => t.startsWith(n) || t.includes(`from ${n}`)) ?? 'Vineet';
    return `Reassigned. Task moved from ${fromName.charAt(0).toUpperCase() + fromName.slice(1)} to ${toName.charAt(0).toUpperCase() + toName.slice(1)}. Old block cancelled. New block created if hours were specified.`;
  }

  // Missing due date
  if (!t.includes('june') && !t.includes('july') && !t.includes('tomorrow') && !t.includes('monday') &&
    !t.includes('today') && !t.match(/\d+\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/)) {
    return `When is this due? Due date is required before I can assign.`;
  }

  // Missing hours — ask once
  if (!t.match(/\d+\s*h(r|rs|ours)?/)) {
    return `How many hours should this take? (Say "skip" to assign without a calendar block.)`;
  }

  // Skip hours
  if (t.includes('skip') || t.includes('no hours') || t.includes("don't know")) {
    return `Got it. Task assigned with deadline only — no calendar block. You can add hours later via Edit on the Tasks page.`;
  }

  // Overloaded person
  if (t.includes('manan') && (t.includes('20') || t.includes('heavy') || t.includes('lot'))) {
    return `Manan already has 18h active this week. Still want to assign? Confirm and I'll proceed.`;
  }

  // Specific people
  if (t.includes('vineet')) return `Done. Vineet blocked ${t.match(/\d+\s*h/)?.[0] ?? '3h'} for ${t.includes('indiagate') ? 'IndiaGate' : 'the brand'} — ${t.includes('reel') ? 'Reel edit' : t.includes('video') ? 'Video edit' : 'task'} (P1). Slack notified.`;
  if (t.includes('manan')) return `Done. Manan assigned ${t.includes('alphakid') ? 'AlphaKid' : 'brand'} — ${t.includes('script') ? 'script' : t.includes('copy') ? 'copy' : 'task'} (P1). Slack notified.`;
  if (t.includes('dhwani')) return `Done. Dhwani blocked ${t.match(/\d+\s*h/)?.[0] ?? '4h'} for ${t.includes('vadilal') ? 'Vadilal' : 'brand'} — ${t.includes('post') ? 'social posts' : 'content'} (P2). Slack notified.`;
  if (t.includes('pratik')) return `Done. Pratik blocked ${t.match(/\d+\s*h/)?.[0] ?? '4h'} for ${t.includes('truesilver') ? 'TrueSilver' : 'brand'} — design task (P1). Slack notified.`;
  if (t.includes('tarun')) return `Done. Tarun blocked ${t.match(/\d+\s*h/)?.[0] ?? '3h'} for ${t.includes('indiagate') ? 'IndiaGate' : 'brand'} — video edit (P1). Slack notified.`;

  // Generic fallback
  return `Done. Task assigned and calendar block created. Slack notified.`;
}

export default function DemoChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    const captured = input;
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      setMessages(m => [...m, { role: 'assistant', content: getReply(captured) }]);
      setLoading(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <h1 className="font-display text-5xl uppercase tracking-tight mb-2">Allocator</h1>
      <p className="text-sm text-[var(--gray)] mb-1 font-mono">
        Assign work, bulk-allocate, or reassign tasks in plain language.
      </p>
      <p className="text-xs text-[var(--cobalt)] font-mono mb-6">Demo mode — replies are simulated, no DB writes.</p>

      {/* Example prompts */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          'Block Vineet 3hrs for IndiaGate reel, due 8 June',
          'Move IndiaGate reel from Vineet to Tarun',
          'Morning block: Vineet IndiaGate 3h, Manan AlphaKid 2h, due 9 June',
        ].map(ex => (
          <button
            key={ex}
            onClick={() => setInput(ex)}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              border: '1px solid var(--line)',
              borderRadius: '999px',
              padding: '4px 12px',
              background: 'transparent',
              color: 'var(--gray)',
              cursor: 'pointer',
            }}
          >
            {ex.length > 40 ? ex.slice(0, 38) + '…' : ex}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-[var(--gray)] text-sm">No messages yet. Try one of the examples above or type your own.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className="inline-block max-w-2xl px-4 py-2 rounded-lg text-sm whitespace-pre-line"
              style={m.role === 'user'
                ? { background: 'var(--ink)', color: 'var(--cream)' }
                : { background: 'var(--cream-2, #e8e3d8)' }}
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
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Block Vineet 3hrs for IndiaGate reel, due 8 June"
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
