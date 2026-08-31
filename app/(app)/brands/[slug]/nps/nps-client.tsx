'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Brand = { id: string; name: string; slug: string };
type NpsResponse = {
  responseId: string;
  createTime: string;
  score: number | null;
  answers: Record<string, string>;
  quarter: string;
  form_id: string;
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: 'var(--gray)', fontFamily: 'var(--f-mono)', fontSize: '11px' }}>N/A</span>;
  const bg = score >= 9 ? '#dcfce7' : score >= 7 ? '#fef9c3' : '#fee2e2';
  const color = score >= 9 ? '#15803d' : score >= 7 ? '#a16207' : '#dc2626';
  return (
    <span style={{ background: bg, color, fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px' }}>
      {score}
    </span>
  );
}

export default function NpsClient({ brand, isAdmin }: { brand: Brand; isAdmin: boolean }) {
  const [responses, setResponses] = useState<NpsResponse[]>([]);
  const [quarters, setQuarters] = useState<string[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Add form modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [formQuarter, setFormQuarter] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  async function load(quarter?: string | null) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ brand_id: brand.id });
    if (quarter) params.set('quarter', quarter);
    const res = await fetch(`/api/nps-forms/responses?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to load responses');
      setLoading(false);
      return;
    }
    setResponses(data.responses ?? []);
    setQuarters(data.quarters ?? []);
    setLoading(false);
  }

  useEffect(() => { load(null); }, [brand.id]);

  async function addForm() {
    if (!formUrl || !formQuarter) { setAddError('Both fields required'); return; }
    setAdding(true);
    setAddError('');
    const res = await fetch('/api/nps-forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: brand.id, form_url: formUrl, quarter: formQuarter }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? 'Failed'); setAdding(false); return; }
    setShowAddForm(false);
    setFormUrl('');
    setFormQuarter('');
    setAdding(false);
    load(selectedQuarter);
  }

  const scoredResponses = responses.filter(r => r.score !== null);
  const promoters = scoredResponses.filter(r => (r.score ?? 0) >= 9).length;
  const detractors = scoredResponses.filter(r => (r.score ?? 0) <= 6).length;
  const npsScore = scoredResponses.length
    ? Math.round((promoters / scoredResponses.length - detractors / scoredResponses.length) * 100)
    : null;

  // Per-question averages across all responses
  const questionAvgs: { label: string; avg: number; count: number; isNps: boolean }[] = (() => {
    const acc: Record<string, { sum: number; count: number }> = {};
    for (const r of responses) {
      for (const [label, text] of Object.entries(r.answers)) {
        const num = Number(text);
        if (text.trim() === '' || isNaN(num) || num < 0 || num > 10) continue;
        if (!acc[label]) acc[label] = { sum: 0, count: 0 };
        acc[label].sum += num;
        acc[label].count += 1;
      }
    }
    return Object.entries(acc).map(([label, { sum, count }]) => ({
      label,
      avg: Math.round((sum / count) * 10) / 10,
      count,
      isNps: label.toLowerCase().includes('recommend') || label.toLowerCase().includes('likely') || label.toLowerCase().includes('nps'),
    }));
  })();

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/brands/${brand.slug}`} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ← {brand.name}
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: '4px' }}>
            NPS — {brand.name}
          </h1>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>
            {scoredResponses.length} scored responses · {responses.length} total
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Quarter filters */}
          <button
            onClick={() => { setSelectedQuarter(null); load(null); }}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '5px 12px', borderRadius: '999px', border: '1px solid var(--ink)', background: selectedQuarter === null ? 'var(--ink)' : 'transparent', color: selectedQuarter === null ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer' }}>
            All
          </button>
          {quarters.map(q => (
            <button key={q}
              onClick={() => { setSelectedQuarter(q); load(q); }}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '5px 12px', borderRadius: '999px', border: '1px solid var(--ink)', background: selectedQuarter === q ? 'var(--ink)' : 'transparent', color: selectedQuarter === q ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer' }}>
              {q}
            </button>
          ))}

          {isAdmin && (
            <button onClick={() => setShowAddForm(true)}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '5px 14px', borderRadius: '999px', border: '1.5px solid var(--ink)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', fontWeight: 700 }}>
              + Add Form
            </button>
          )}
        </div>
      </div>

      {/* Aggregate stats */}
      {!loading && !error && responses.length > 0 && (
        <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* NPS breakdown — only if we have scored responses */}
          {scoredResponses.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'NPS Score', value: npsScore !== null ? (npsScore > 0 ? `+${npsScore}` : `${npsScore}`) : '—', color: npsScore !== null && npsScore >= 50 ? '#15803d' : npsScore !== null && npsScore >= 0 ? '#a16207' : '#dc2626', bg: npsScore !== null && npsScore >= 50 ? '#dcfce7' : npsScore !== null && npsScore >= 0 ? '#fef9c3' : '#fee2e2' },
                { label: 'Promoters (9-10)', value: `${promoters}`, color: '#15803d', bg: '#dcfce7' },
                { label: 'Passives (7-8)', value: `${scoredResponses.length - promoters - detractors}`, color: '#a16207', bg: '#fef9c3' },
                { label: 'Detractors (0-6)', value: `${detractors}`, color: '#dc2626', bg: '#fee2e2' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ flex: '1 1 130px', background: bg, border: `1px solid ${color}33`, borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '26px', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Per-question averages */}
          {questionAvgs.length > 0 && (
            <div style={{ border: '1.5px solid var(--ink)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', padding: '8px 16px', borderBottom: '1px solid var(--border, #e5e2da)', background: 'var(--paper)' }}>
                Avg scores across {responses.length} responses
              </div>
              {questionAvgs.map(({ label, avg, count, isNps }) => {
                const pct = (avg / 10) * 100;
                const barColor = avg >= 8 ? '#16a34a' : avg >= 6 ? '#ca8a04' : '#dc2626';
                return (
                  <div key={label} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border, #e5e2da)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, fontFamily: 'var(--f-body)', fontSize: '12px', color: 'var(--ink)', minWidth: 0 }}>
                      {isNps && <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', background: 'var(--ink)', color: 'var(--cream)', borderRadius: '4px', padding: '1px 5px', marginRight: '6px', textTransform: 'uppercase' }}>NPS</span>}
                      {label}
                    </div>
                    <div style={{ width: '120px', height: '6px', background: '#e5e2da', borderRadius: '3px', flexShrink: 0 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700, color: barColor, width: '32px', textAlign: 'right', flexShrink: 0 }}>{avg}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', flexShrink: 0 }}>/ 10</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Responses */}
      {loading ? (
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--gray)', padding: '40px 0' }}>Loading...</p>
      ) : error ? (
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--coral)', padding: '40px 0' }}>{error}</p>
      ) : responses.length === 0 ? (
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--gray)', padding: '40px 0' }}>No responses yet. {isAdmin && 'Add a form to start collecting.'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {responses.map(r => {
            const isOpen = expanded === r.responseId;
            const date = new Date(r.createTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div key={r.responseId} style={{ border: '1.5px solid var(--line)', borderRadius: '10px', overflow: 'hidden', background: 'var(--paper)' }}>
                <button onClick={() => setExpanded(isOpen ? null : r.responseId)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <ScoreBadge score={r.score} />
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>{date}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 }}>{r.quarter}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--line)' }}>
                    {Object.entries(r.answers).map(([q, a]) => (
                      <div key={q} style={{ marginTop: '12px' }}>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: '4px' }}>{q}</p>
                        <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>{a || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
          <div style={{ background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '14px', padding: '28px', width: '420px', boxShadow: '8px 8px 0 var(--ink)' }}>
            <h2 style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>Add NPS Form</h2>

            <label style={labelStyle}>Google Form URL</label>
            <input value={formUrl} onChange={e => setFormUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/..."
              style={inputStyle} />

            <label style={{ ...labelStyle, marginTop: '14px' }}>Quarter</label>
            <input value={formQuarter} onChange={e => setFormQuarter(e.target.value)}
              placeholder="e.g. Q3 2026"
              style={inputStyle} />

            {addError && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--coral)', marginTop: '10px' }}>{addError}</p>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={addForm} disabled={adding}
                style={{ flex: 1, padding: '10px', borderRadius: '999px', border: 'none', background: 'var(--ink)', color: 'var(--cream)', fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
                {adding ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowAddForm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '999px', border: '1px solid var(--line)', background: 'transparent', fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', color: 'var(--gray)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', fontFamily: 'var(--f-mono)', fontSize: '12px', padding: '9px 12px',
  border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--paper)',
  color: 'var(--ink)', boxSizing: 'border-box',
};
