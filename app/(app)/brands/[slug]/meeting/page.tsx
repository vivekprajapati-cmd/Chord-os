'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';

type ExtractedTask = {
  deliverable: string;
  task_type: string;
  estimated_hours: number;
  priority: string;
  assignee_role: string;
  brief: string;
  owner_id?: string;
  deadline?: string;
  included: boolean;
};

type Extracted = {
  summary: string;
  decisions: { text: string; impact: string }[];
  tasks_suggested: Omit<ExtractedTask, 'included'>[];
  knowledge_delta: { rule: string; category: string }[];
  contacts: { name: string; role: string }[];
};

const CATEGORY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  tone:    { bg: 'rgba(34,38,217,0.07)',  color: '#2226D9', border: 'rgba(34,38,217,0.2)'  },
  visual:  { bg: 'rgba(240,230,60,0.18)', color: '#5a4f00', border: 'rgba(200,185,0,0.3)'  },
  process: { bg: 'rgba(10,10,10,0.05)',   color: '#7A7468', border: 'rgba(10,10,10,0.12)'  },
  hard_no: { bg: 'rgba(255,59,47,0.08)',  color: '#FF3B2F', border: 'rgba(255,59,47,0.2)'  },
};

const inputCls = 'w-full bg-[var(--cream)] border border-[var(--line)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] font-mono';
const labelCls = 'block text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-1';

export default function MeetingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [notes, setNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) { setError('Paste your meeting notes first.'); return; }
    setExtracting(true);
    setError('');
    setExtracted(null);
    try {
      const res = await fetch('/api/brands/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_slug: slug, raw_notes: notes, meeting_date: meetingDate, action: 'extract' }),
      });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch { setError('Server returned an empty response. Check your ANTHROPIC_API_KEY.'); return; }
      if (!res.ok) { setError((data.error as string) ?? 'Extraction failed.'); return; }
      const ext = data.extracted as Extracted;
      setExtracted(ext);
      setTasks((ext.tasks_suggested ?? []).map(t => ({ ...t, included: true, deadline: '', owner_id: '' })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setExtracting(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    setError('');
    try {
      const res = await fetch('/api/brands/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_slug: slug,
          raw_notes: notes,
          meeting_date: meetingDate,
          action: 'confirm',
          extracted,
          tasks_to_create: tasks.filter(t => t.included),
        }),
      });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch { setError('Server error while saving.'); return; }
      if (!res.ok) { setError((data.error as string) ?? 'Failed to save.'); return; }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setConfirming(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl space-y-6 pt-4">
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)' }}>
          Saved
        </p>
        <h1 className="font-display text-5xl uppercase tracking-tight">Brain updated.</h1>
        <p className="text-sm text-[var(--gray)]">Tasks created, knowledge saved. The art team will see the full brief on their cards.</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/brands/${slug}`)}
            className="px-6 py-3 rounded-full text-xs font-mono uppercase tracking-[0.12em] hover:opacity-90 transition"
            style={{ background: 'var(--ink)', color: 'var(--cream)' }}
          >
            Back to brand
          </button>
          <button
            onClick={() => { setDone(false); setExtracted(null); setNotes(''); setTasks([]); }}
            className="px-6 py-3 rounded-full border border-[var(--line)] text-xs font-mono uppercase tracking-[0.12em] hover:border-[var(--ink)] transition"
          >
            Log another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/brands/${slug}`)}
          style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}
          className="mb-4 block hover:text-[var(--ink)]"
        >
          ← Back to {slug}
        </button>
        <h1 className="font-display text-5xl uppercase tracking-tight">Log meeting</h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '6px' }}>
          Dump your notes. Claude extracts tasks + brand rules automatically.
        </p>
      </div>

      {/* Notes form — always visible */}
      <form onSubmit={handleExtract} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Meeting date</label>
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Dump everything from the meeting</label>
          <textarea
            rows={8}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={`Write or paste raw notes. No structure needed.\n\nExample: Met Sanya from IndiaGate. They want 3 statics + 1 reel for Eid. Family moments, warm lighting, no close-ups. Hated the last carousel — too corporate. Ref: Paperboat Diwali ads. Deadline May 20. Rohan mentioned CMO presentation May 21 so cannot miss. Avoid exclamation marks in headlines.`}
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </div>
        {error && (
          <div style={{ background: 'rgba(255,59,47,0.08)', border: '1px solid rgba(255,59,47,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--red)' }}>{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={extracting || !notes.trim()}
          className="w-full uppercase tracking-[0.12em] text-sm font-mono py-4 rounded-full hover:opacity-90 disabled:opacity-40 transition shadow-[4px_4px_0_var(--gray)]"
          style={{ background: 'var(--ink)', color: 'var(--cream)' }}
        >
          {extracting ? 'Extracting with Claude…' : extracted ? 'Re-extract' : 'Extract →'}
        </button>
      </form>

      {/* Extraction results — appear inline after extraction */}
      {extracted && (
        <div className="space-y-6 pt-2">
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '6px' }}>
              What Claude found
            </p>
            <p className="text-sm leading-relaxed">{extracted.summary}</p>
          </div>

          {/* Decisions */}
          {extracted.decisions?.length > 0 && (
            <div>
              <p className={labelCls}>Decisions ({extracted.decisions.length})</p>
              <div className="space-y-2">
                {extracted.decisions.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-5 py-3">
                    <span
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', marginTop: '2px', flexShrink: 0,
                        color: d.impact === 'high' ? 'var(--red)' : d.impact === 'medium' ? 'var(--ink)' : 'var(--gray)' }}
                    >
                      {d.impact}
                    </span>
                    <p className="text-sm">{d.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div>
              <p className={labelCls}>Tasks to create ({tasks.filter(t => t.included).length} of {tasks.length} selected)</p>
              <div className="space-y-3">
                {tasks.map((task, i) => (
                  <div
                    key={i}
                    className="bg-[var(--paper)] border rounded-2xl p-5 transition"
                    style={{ borderColor: task.included ? 'var(--ink)' : 'var(--line)', opacity: task.included ? 1 : 0.5,
                      boxShadow: task.included ? '4px 4px 0 var(--ink)' : 'none' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--gray)' }}>
                          {task.task_type} · {task.estimated_hours}h · {task.priority} · {task.assignee_role}
                        </p>
                        <p className="font-display text-xl uppercase tracking-tight mt-0.5">{task.deliverable}</p>
                      </div>
                      <button
                        onClick={() => setTasks(ts => ts.map((t, j) => j === i ? { ...t, included: !t.included } : t))}
                        className="shrink-0 text-xs font-mono uppercase px-3 py-1.5 rounded-full border transition"
                        style={task.included
                          ? { background: 'var(--ink)', color: 'var(--cream)', borderColor: 'var(--ink)' }
                          : { borderColor: 'var(--line)', color: 'var(--gray)' }}
                      >
                        {task.included ? '✓ In' : 'Skip'}
                      </button>
                    </div>

                    {task.included && (
                      <div className="space-y-3 pt-3 border-t border-[var(--line)]">
                        <div>
                          <label className={labelCls}>Brief (art team sees this)</label>
                          <textarea
                            rows={3}
                            value={task.brief}
                            onChange={e => setTasks(ts => ts.map((t, j) => j === i ? { ...t, brief: e.target.value } : t))}
                            className={`${inputCls} resize-none text-xs leading-relaxed`}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Deadline (optional)</label>
                          <input
                            type="datetime-local"
                            value={task.deadline ?? ''}
                            onChange={e => setTasks(ts => ts.map((t, j) => j === i ? { ...t, deadline: e.target.value } : t))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New brand rules */}
          {extracted.knowledge_delta?.length > 0 && (
            <div>
              <p className={labelCls}>New brand rules ({extracted.knowledge_delta.length})</p>
              <div className="flex flex-wrap gap-2">
                {extracted.knowledge_delta.map((k, i) => {
                  const s = CATEGORY_STYLE[k.category] ?? CATEGORY_STYLE.process;
                  return (
                    <span
                      key={i}
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                      className="text-xs font-mono px-3 py-1.5 rounded-full"
                    >
                      <span className="uppercase opacity-60 mr-1">{k.category}:</span>
                      {k.rule}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirm */}
          <div className="pt-2 border-t border-[var(--line)]">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full uppercase tracking-[0.12em] text-sm font-mono py-4 rounded-full hover:opacity-90 disabled:opacity-50 transition shadow-[6px_6px_0_var(--ink)]"
              style={{ background: 'var(--ink)', color: 'var(--cream)' }}
            >
              {confirming ? 'Saving…' : `Confirm — create ${tasks.filter(t => t.included).length} task${tasks.filter(t => t.included).length !== 1 ? 's' : ''} + update brain`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
