'use client';

import { useState } from 'react';

type Person = { id: string; name: string; role: string | null; department: string | null };
type FeedbackRow = { id: string; period: string; content: string; hr_notes: string | null; status: string; created_at: string; published_at?: string | null; people: { name: string } | null; submitter: { name: string } | null };

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--ink)',
  background: 'var(--paper, #fafaf8)', border: '1px solid var(--ink)',
  borderRadius: '6px', padding: '8px 10px', width: '100%', outline: 'none',
};

const label9: React.CSSProperties = {
  fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '4px',
};

export default function HRFeedbackClient({ selfId, allPeople, pendingFeedback, recentPublished }: {
  selfId: string;
  allPeople: Person[];
  pendingFeedback: FeedbackRow[];
  recentPublished: FeedbackRow[];
}) {
  const [tab, setTab] = useState<'submit' | 'review'>('submit');

  // Submit state
  const [form, setForm] = useState({ person_id: allPeople[0]?.id ?? '', period: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [localPending, setLocalPending] = useState<FeedbackRow[]>(pendingFeedback);

  // Review state
  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [hrNotes, setHrNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  async function submit() {
    if (!form.person_id) { setSubmitError('Select an employee.'); return; }
    if (!form.period.trim()) { setSubmitError('Period is required (e.g. Q2 2026).'); return; }
    if (!form.content.trim()) { setSubmitError('Feedback content is required.'); return; }
    setSubmitting(true); setSubmitError('');
    const res = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setSubmitError(d.error ?? 'Failed.'); return; }
    const { feedback } = await res.json();
    const emp = allPeople.find(p => p.id === form.person_id);
    setLocalPending(prev => [{ ...feedback, people: emp ? { name: emp.name } : null, submitter: null }, ...prev]);
    setSubmitSuccess(true);
    setForm({ person_id: allPeople[0]?.id ?? '', period: '', content: '' });
    setTimeout(() => setSubmitSuccess(false), 4000);
  }

  async function publish() {
    if (!selected) return;
    setPublishing(true); setPublishError('');
    const res = await fetch('/api/feedback', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, hr_notes: hrNotes }),
    });
    setPublishing(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setPublishError(d.error ?? 'Failed.'); return; }
    setLocalPending(prev => prev.filter(f => f.id !== selected.id));
    setSelected(null);
    setHrNotes('');
  }

  const tabBtn = (t: 'submit' | 'review', label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      style={{
        fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
        border: '1px solid var(--ink)', borderRadius: '999px', padding: '6px 18px', cursor: 'pointer',
        background: tab === t ? 'var(--ink)' : 'transparent',
        color: tab === t ? 'var(--cream)' : 'var(--ink)',
      }}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '60px' }}>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '6px' }}>HR</p>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px, 5vw, 56px)', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink)', marginBottom: '20px' }}>
        Feedback
      </h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {tabBtn('submit', 'Write Feedback')}
        {tabBtn('review', 'Pending Review', localPending.length)}
      </div>

      {tab === 'submit' && (
        <div>
          {submitSuccess && (
            <div style={{ background: '#D1FAE5', border: '1px solid #065F46', borderRadius: '8px', padding: '12px 16px', fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
              Submitted. Now visible in Pending Review.
            </div>
          )}
          <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>New Feedback Entry</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={label9}>Employee</label>
                  <select value={form.person_id} onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))} style={inputStyle}>
                    {allPeople.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.role ? ` · ${p.role}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={label9}>Period</label>
                  <input type="text" placeholder="e.g. Q2 2026, August 2026" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={label9}>Feedback</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder="Be specific about performance, contributions, and areas for growth." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              {submitError && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#991B1B' }}>{submitError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={submit} disabled={submitting} style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px 28px', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Saving…' : 'Save for Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
          {/* List */}
          <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>Pending HR Review</span>
            </div>
            {localPending.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)' }}>No pending feedback</p>
              </div>
            ) : (
              localPending.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => { setSelected(f); setHrNotes(f.hr_notes ?? ''); setPublishError(''); }}
                  style={{ width: '100%', textAlign: 'left', background: selected?.id === f.id ? 'var(--ink)' : 'transparent', border: 'none', borderBottom: i < localPending.length - 1 ? '1px solid var(--line)' : 'none', padding: '14px 20px', cursor: 'pointer' }}
                >
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: selected?.id === f.id ? 'var(--cream)' : 'var(--ink)' }}>
                    {f.people?.name ?? '—'} · {f.period}
                  </p>
                  <p style={{ fontFamily: 'var(--f-body)', fontSize: '12px', color: selected?.id === f.id ? 'rgba(240,237,229,0.7)' : 'var(--gray)', marginTop: '3px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {f.content}
                  </p>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: selected?.id === f.id ? 'rgba(240,237,229,0.5)' : 'var(--gray)', marginTop: '4px' }}>
                    {new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>{selected.people?.name} · {selected.period}</span>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Close</button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={label9}>Feedback Content</label>
                  <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.content}</p>
                </div>
                <div>
                  <label style={label9}>HR Notes (optional)</label>
                  <textarea value={hrNotes} onChange={e => setHrNotes(e.target.value)} rows={4} placeholder="Add context or additional notes before publishing…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
                {publishError && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#991B1B' }}>{publishError}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={publish} disabled={publishing} style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: '999px', padding: '10px 28px', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: publishing ? 'not-allowed' : 'pointer', opacity: publishing ? 0.6 : 1 }}>
                    {publishing ? 'Publishing…' : 'Publish to Profile'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently published */}
      {tab === 'review' && recentPublished.length > 0 && (
        <div style={{ marginTop: '24px', border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>Recently Published</span>
          </div>
          {recentPublished.map((f, i) => (
            <div key={f.id} style={{ padding: '12px 20px', borderBottom: i < recentPublished.length - 1 ? '1px solid var(--line)' : 'none', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>{f.people?.name ?? '—'} · {f.period}</p>
                <p style={{ fontFamily: 'var(--f-body)', fontSize: '12px', color: 'var(--gray)', marginTop: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{f.content}</p>
              </div>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                {f.published_at ? new Date(f.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
