'use client';

import { useState, useRef } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'recording.webm');
        const res = await fetch('/api/chat/transcribe', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.text) setInput(prev => (prev ? prev + ' ' : '') + data.text);
      } finally {
        setTranscribing(false);
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

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
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing || loading}
          title={recording ? 'Stop recording' : 'Speak to allocate'}
          className="rounded-full w-11 h-11 flex items-center justify-center border disabled:opacity-40 shrink-0"
          style={{
            background: recording ? 'var(--coral)' : 'var(--paper)',
            borderColor: recording ? 'var(--coral)' : 'var(--line)',
            color: recording ? '#fff' : 'var(--gray)',
          }}
        >
          {transcribing ? (
            <span style={{ fontSize: '10px', fontFamily: 'var(--f-mono)' }}>…</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-6.5 10a6.5 6.5 0 0 0 13 0h-1.5a5 5 0 0 1-10 0H5.5zM11 22v-2.07A7.5 7.5 0 0 1 4.5 11H3a9 9 0 0 0 8 8.94V22h1zm2 0h-1v-2.06A9 9 0 0 0 21 11h-1.5a7.5 7.5 0 0 1-6.5 7.93V22h1z"/>
            </svg>
          )}
        </button>
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
