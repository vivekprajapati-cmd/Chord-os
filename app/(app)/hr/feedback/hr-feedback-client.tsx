'use client';

import { useState } from 'react';

type Person = { id: string; name: string; role: string | null; department: string | null };
type LatestFeedback = Record<string, { period: string; rating: number | null; published_at: string }>;
type Stats = { total: number; givenThisQuarter: number; pending: number };

const QUARTERS = ['Q1 2026 (Jan–Mar)', 'Q2 2026 (Apr–Jun)', 'Q3 2026 (Jul–Sep)', 'Q4 2026 (Oct–Dec)', 'Q1 2025 (Jan–Mar)', 'Q2 2025 (Apr–Jun)', 'Q3 2025 (Jul–Sep)', 'Q4 2025 (Oct–Dec)'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function scoreColor(rating: number) {
  if (rating >= 4) return '#16a34a';
  if (rating >= 3) return '#2C7CE5';
  return '#E55D4A';
}

export default function HRFeedbackClient({ people, latestFeedback, stats }: { people: Person[]; latestFeedback: LatestFeedback; stats: Stats }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Person | null>(null);
  const [form, setForm] = useState({ person_id: '', period: QUARTERS[2], rating: '3', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localLatest, setLocalLatest] = useState<LatestFeedback>(latestFeedback);
  const [localStats, setLocalStats] = useState(stats);

  function selectPerson(p: Person) {
    setSelected(p);
    setForm(f => ({ ...f, person_id: p.id }));
    setError('');
  }

  async function submit() {
    if (!form.person_id) { setError('Select an employee first.'); return; }
    if (!form.content.trim()) { setError('Notes are required.'); return; }
    setSubmitting(true); setError('');
    const res = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: form.person_id, period: form.period, content: form.content, rating: parseInt(form.rating) }),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed to submit.'); return; }
    const { feedback } = await res.json();
    setLocalLatest(prev => ({ ...prev, [form.person_id]: { period: form.period, rating: parseInt(form.rating), published_at: feedback.published_at } }));
    setLocalStats(prev => ({ ...prev, givenThisQuarter: prev.givenThisQuarter + 1, pending: Math.max(0, prev.pending - 1) }));
    setForm(f => ({ ...f, content: '', rating: '3' }));
    setSelected(null);
  }

  const filtered = people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.department ?? '').toLowerCase().includes(search.toLowerCase()));

  const statCard = (label: string, value: number, color?: string, sub?: string) => (
    <div style={{ border: '1.5px solid var(--ink)', borderRadius: '12px', boxShadow: '3px 3px 0 var(--ink)', padding: '16px 18px', background: 'var(--cream)' }}>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '28px', fontWeight: 700, lineHeight: 1, color: color ?? 'var(--ink)' }}>{value}</p>
      {sub && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '4px' }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '60px' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {statCard('Total Employees', localStats.total, undefined, `Across ${[...new Set(people.map(p => p.department).filter(Boolean))].length} departments`)}
        {statCard('Feedback Given', localStats.givenThisQuarter, '#16a34a', 'This quarter')}
        {statCard('Pending', localStats.pending, '#E55D4A', 'Awaiting feedback')}
      </div>

      {/* Two-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

        {/* Left: employee table */}
        <div style={{ border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>All Employees</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee…"
              style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px 10px', outline: 'none', width: '180px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Department', 'Last Feedback', 'Score', 'Action'].map(h => (
                    <th key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', padding: '10px 18px', textAlign: 'left', borderBottom: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const fb = localLatest[p.id];
                  const hasNever = !fb;
                  const isActive = selected?.id === p.id;
                  return (
                    <tr key={p.id} style={{ background: isActive ? 'var(--paper)' : 'transparent' }}>
                      <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '9px', fontWeight: 600, flexShrink: 0 }}>
                            {initials(p.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>{p.role ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--f-mono)', fontSize: '11px' }}>{p.department ?? '—'}</td>
                      <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--f-mono)', fontSize: '11px', color: hasNever ? '#E55D4A' : 'var(--gray)' }}>
                        {hasNever ? '— Never' : fb.period}
                      </td>
                      <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
                        {fb?.rating ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scoreColor(fb.rating), display: 'inline-block' }} />
                            {fb.rating} / 5
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No data</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
                        <button
                          onClick={() => selectPerson(p)}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer', border: '1px solid var(--ink)', background: hasNever ? 'var(--ink)' : 'transparent', color: hasNever ? 'var(--cream)' : 'var(--ink)', transition: 'all 0.15s' }}
                        >
                          + Give Feedback
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: sticky form */}
        <div style={{ position: 'sticky', top: '20px', border: '1.5px solid var(--ink)', borderRadius: '14px', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Give Feedback</span>
            <span style={{ background: '#FFFBE6', border: '1px dashed #B45309', borderRadius: '6px', padding: '3px 8px', fontFamily: 'var(--f-mono)', fontSize: '9px', color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.07em' }}>HR Only</span>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '5px' }}>Select Employee</label>
              <select
                value={form.person_id}
                onChange={e => {
                  const p = people.find(x => x.id === e.target.value);
                  if (p) selectPerson(p);
                }}
                style={{ width: '100%', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'var(--f-mono)', fontSize: '12px', background: 'white', color: 'var(--ink)', cursor: 'pointer' }}
              >
                <option value="">— Select employee —</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.department ? ` — ${p.department}` : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '5px' }}>Period</label>
                <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'white', color: 'var(--ink)', cursor: 'pointer' }}>
                  {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '5px' }}>Rating (1–5)</label>
                <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'white', color: 'var(--ink)', cursor: 'pointer' }}>
                  <option value="5">5 — Exceptional</option>
                  <option value="4">4 — Above Average</option>
                  <option value="3">3 — Meets Expectations</option>
                  <option value="2">2 — Needs Improvement</option>
                  <option value="1">1 — Poor</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '5px' }}>Notes</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                placeholder="Write observations, highlights, and areas to improve…"
                style={{ width: '100%', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 12px', fontFamily: 'var(--f-body)', fontSize: '13px', background: 'white', color: 'var(--ink)', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
            {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#991B1B', marginBottom: '12px' }}>{error}</p>}
            <div style={{ height: '1px', background: 'var(--line)', margin: '12px 0' }} />
            <button
              onClick={submit}
              disabled={submitting}
              style={{ width: '100%', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Saving…' : 'Submit Feedback'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
