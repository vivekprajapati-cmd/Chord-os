'use client';

import { useState } from 'react';

type Reportee = { id: string; name: string; role: string | null; department: string | null };
type Submitted = { id: string; period: string; content: string; status: string; created_at: string; people: { name: string } | null };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending_hr: { bg: '#EDE9FE', color: '#5B21B6' },
  published:  { bg: '#D1FAE5', color: '#065F46' },
};

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--ink)',
  background: 'var(--paper, #fafaf8)', border: '1px solid var(--ink)',
  borderRadius: '6px', padding: '8px 10px', width: '100%', outline: 'none',
};

export default function FeedbackSubmitClient({ reportees, submitted }: { reportees: Reportee[]; submitted: Submitted[] }) {
  const [form, setForm] = useState({ person_id: reportees[0]?.id ?? '', period: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(submitted);

  async function submit() {
    if (!form.person_id) { setError('Select an employee.'); return; }
    if (!form.period.trim()) { setError('Period is required (e.g. Q2 2026).'); return; }
    if (!form.content.trim()) { setError('Feedback content is required.'); return; }
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed to submit.'); return; }
    const { feedback } = await res.json();
    setLocalSubmitted(prev => [{ ...feedback, people: reportees.find(r => r.id === form.person_id) ?? null }, ...prev]);
    setSuccess(true);
    setForm({ person_id: reportees[0]?.id ?? '', period: '', content: '' });
    setTimeout(() => setSuccess(false), 5000);
  }

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '60px' }}>
      {/* Header */}
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '6px' }}>HR</p>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px, 5vw, 56px)', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink)', marginBottom: '4px' }}>
        Write Feedback
      </h1>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginBottom: '32px', letterSpacing: '0.04em' }}>
        Submit feedback for your team. HR will review and publish it to the employee's profile.
      </p>

      {success && (
        <div style={{ background: '#D1FAE5', border: '1px solid #065F46', borderRadius: '8px', padding: '12px 16px', fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
          Feedback submitted. HR will review and publish it shortly.
        </div>
      )}

      {/* Form card */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>New Feedback</span>
        </div>
        <div style={{ padding: '20px' }}>
          {reportees.length === 0 ? (
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--gray)', textAlign: 'center', padding: '24px 0' }}>
              No direct reports found. Make sure your team members have you set as their manager.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '4px' }}>Employee</label>
                  <select value={form.person_id} onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))} style={inputStyle}>
                    {reportees.map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.role ? ` · ${r.role}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '4px' }}>Period</label>
                  <input
                    type="text"
                    placeholder="e.g. Q2 2026, August 2026"
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '4px' }}>Feedback</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={6}
                  placeholder="Write your feedback here. Be specific about what went well, areas to improve, and any notable contributions."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
              {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#991B1B' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px 28px', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'Submitting…' : 'Submit to HR'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submission history */}
      {localSubmitted.length > 0 && (
        <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>Previously Submitted</span>
          </div>
          {localSubmitted.map((s, i) => {
            const st = STATUS_STYLE[s.status] ?? { bg: '#F3F4F6', color: '#374151' };
            return (
              <div key={s.id} style={{ padding: '14px 20px', borderBottom: i < localSubmitted.length - 1 ? '1px solid var(--line)' : 'none', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'start', gap: '16px' }}>
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {s.people?.name ?? '—'} · {s.period}
                  </p>
                  <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--gray)', marginTop: '4px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {s.content}
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '999px', padding: '3px 10px', background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                  {s.status === 'pending_hr' ? 'Pending HR' : 'Published'}
                </span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                  {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
