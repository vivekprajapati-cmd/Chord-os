'use client';

import { useState } from 'react';

type ReviewType = 'review' | 'attention';

export default function ClientReviewBar() {
  const [active, setActive] = useState<ReviewType | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function open(type: ReviewType) {
    setActive(type);
    setMessage('');
    setError('');
    setSuccess('');
  }

  function close() {
    setActive(null);
    setMessage('');
    setError('');
    setSuccess('');
  }

  async function submit() {
    if (!message.trim() || !active) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/client/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: active, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.');
      } else {
        setSuccess(active === 'review' ? 'Review submitted. Thank you.' : 'Flagged. Our team will follow up.');
        setMessage('');
        setTimeout(close, 2500);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Bottom bar */}
      <div style={{
        background: 'var(--ink)', borderRadius: '16px', padding: '20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      }}>
        <div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cream)', fontWeight: 600 }}>
            Have feedback?
          </p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'rgba(240,237,229,0.5)', marginTop: '2px' }}>
            Leave a review or flag something that needs attention
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => open('review')}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'transparent', color: 'var(--cream)', border: '1px solid rgba(240,237,229,0.3)',
              borderRadius: '999px', padding: '10px 20px', cursor: 'pointer',
            }}
          >
            Leave a Review
          </button>
          <button
            onClick={() => open('attention')}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'var(--coral)', color: 'var(--cream)', border: '1px solid var(--coral)',
              borderRadius: '999px', padding: '10px 20px', cursor: 'pointer',
            }}
          >
            Flag Attention
          </button>
        </div>
      </div>

      {/* Expanded form */}
      {active && (
        <div style={{
          marginTop: '12px', background: 'var(--paper)', border: '1.5px solid var(--ink)',
          borderRadius: '16px', padding: '24px', boxShadow: '4px 4px 0 var(--ink)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              {active === 'review' ? 'Leave a Review' : 'Flag Attention Required'}
            </p>
            <button onClick={close} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--gray)', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder={active === 'review'
              ? 'Share your feedback on recent work, quality, or communication…'
              : 'Describe what needs urgent attention or is blocked…'
            }
            style={{
              width: '100%', background: 'var(--cream)', border: '1px solid var(--ink)',
              borderRadius: '10px', padding: '12px 14px', fontSize: '14px',
              fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
              {message.length}/1000
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--red)' }}>{error}</p>}
              {success && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: '#1a7a45' }}>{success}</p>}
              <button
                onClick={submit}
                disabled={submitting || !message.trim()}
                style={{
                  fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: active === 'attention' ? 'var(--coral)' : 'var(--ink)',
                  color: 'var(--cream)', border: 'none', borderRadius: '999px',
                  padding: '10px 20px', cursor: submitting || !message.trim() ? 'not-allowed' : 'pointer',
                  opacity: submitting || !message.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
