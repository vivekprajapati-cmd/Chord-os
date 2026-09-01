'use client';

import Link from 'next/link';

const CORAL = '#E5533D';
const CORAL_BG = '#FEF0ED';

function HRIllustration() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* background circles */}
      <circle cx="180" cy="40" r="38" fill="#F9D5CC" opacity="0.5" />
      <circle cx="140" cy="120" r="22" fill="#DBEAFE" opacity="0.4" />
      {/* people group */}
      <circle cx="52" cy="58" r="16" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
      <path d="M28 95c0-13 10-20 24-20s24 7 24 20" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="70" r="13" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
      <path d="M60 104c0-10 8-16 20-16s20 6 20 16" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* document */}
      <rect x="110" y="30" width="52" height="68" rx="4" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
      <line x1="122" y1="50" x2="150" y2="50" stroke="#ccc" strokeWidth="1.5" />
      <line x1="122" y1="60" x2="150" y2="60" stroke="#ccc" strokeWidth="1.5" />
      <line x1="122" y1="70" x2="140" y2="70" stroke="#ccc" strokeWidth="1.5" />
      {/* calendar */}
      <rect x="142" y="72" width="52" height="50" rx="4" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
      <line x1="142" y1="84" x2="194" y2="84" stroke="#1a1a1a" strokeWidth="1" />
      <rect x="154" y="91" width="8" height="6" rx="1" fill={CORAL} />
      <rect x="167" y="91" width="8" height="6" rx="1" fill="#ccc" />
      <rect x="180" y="91" width="8" height="6" rx="1" fill="#ccc" />
      <rect x="154" y="102" width="8" height="6" rx="1" fill="#ccc" />
      <rect x="167" y="102" width="8" height="6" rx="1" fill="#ccc" />
      {/* rupee coin */}
      <circle cx="200" cy="130" r="16" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
      <text x="200" y="135" textAnchor="middle" fontSize="13" fontFamily="serif" fill="#1a1a1a">₹</text>
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:         { label: 'PENDING',         bg: '#FFF3CD', color: '#92600A' },
    approved:        { label: 'APPROVED',         bg: '#D1FAE5', color: '#065F46' },
    rejected:        { label: 'REJECTED',         bg: '#FEE2E2', color: '#991B1B' },
    pending_hr:      { label: 'PENDING REVIEW',   bg: '#EDE9FE', color: '#5B21B6' },
    published:       { label: 'PUBLISHED',        bg: '#D1FAE5', color: '#065F46' },
  };
  const s = map[status] ?? { label: status.toUpperCase(), bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{
      fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.08em',
      textTransform: 'uppercase', background: s.bg, color: s.color,
      borderRadius: '999px', padding: '3px 8px', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const isLeave = type === 'leave';
  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
      background: isLeave ? '#FEF0ED' : '#EDE9FE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {isLeave ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="2" strokeLinecap="round">
          <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
          <polygon points="9,11 15,11 22,15 22,21 9,21" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </div>
  );
}

export default function HRClient({
  pendingLeaves,
  activity,
}: {
  pendingLeaves: number;
  activity: { type: string; person: string; status: string; time: string }[];
}) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  const cards = [
    {
      num: '01', title: 'FEEDBACK', href: '/hr/feedback',
      desc: 'Managers submit feedback per employee. HR reviews, adds notes, and publishes to their profile.',
      badge: null,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      num: '02', title: 'LEAVES', href: '/hr/leaves',
      desc: 'Employees apply for leave. Manager approves or rejects. Balance tracked per person.',
      badge: pendingLeaves > 0 ? `${pendingLeaves} PENDING REQUESTS` : null,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round">
          <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
          <polygon points="9,11 15,11 22,15 22,21 9,21" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ paddingTop: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>
            {dateLabel}
          </p>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(64px, 8vw, 96px)', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: '4px' }}>
            HR
          </h1>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '12px' }}>
            People Operations
          </p>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '14px', color: 'var(--gray)', maxWidth: '380px', lineHeight: 1.5 }}>
            Manage feedback, leave and payroll across the organization.
          </p>
        </div>
        <div style={{ flexShrink: 0, marginTop: '-8px' }}>
          <HRIllustration />
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {cards.map((card) => {
          const isDisabled = !card.href;
          const inner = (
            <div style={{
              background: 'white',
              border: `1px solid ${isDisabled ? '#E5E7EB' : 'var(--line)'}`,
              borderLeft: `3px solid ${isDisabled ? '#E5E7EB' : CORAL}`,
              borderRadius: '8px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              height: '100%',
              opacity: isDisabled ? 0.5 : 1,
              transition: 'box-shadow 0.15s',
            }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', color: CORAL }}>
                {card.num}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '999px',
                  background: isDisabled ? '#F3F4F6' : CORAL_BG,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: '20px', letterSpacing: '-0.01em', color: isDisabled ? '#9CA3AF' : 'var(--ink)', textTransform: 'uppercase' }}>
                  {card.title}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--gray)', lineHeight: 1.55, flex: 1 }}>
                {card.desc}
              </p>
              {card.badge && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E5533D" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                  </svg>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: CORAL }}>
                    {card.badge}
                  </span>
                </div>
              )}
              <div>
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: isDisabled ? '#9CA3AF' : CORAL,
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}>
                  {isDisabled ? 'COMING SOON' : 'OPEN'} {!isDisabled && '→'}
                </span>
              </div>
            </div>
          );

          if (isDisabled) return <div key={card.num}>{inner}</div>;

          return (
            <Link key={card.num} href={card.href!} style={{ textDecoration: 'none', display: 'block' }}
              className="group"
            >
              <style>{`.group:hover > div { box-shadow: 4px 4px 0 var(--ink); }`}</style>
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 600 }}>
            Recent HR Activity
          </span>
          <Link href="/hr/leaves" style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: CORAL, textDecoration: 'none' }}>
            View All Activity →
          </Link>
        </div>

        <div style={{ border: '1px solid var(--line)', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
          {activity.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              No recent activity
            </div>
          ) : (
            activity.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '32px 1fr 140px 180px 160px 32px',
                alignItems: 'center', gap: '16px', padding: '14px 20px',
                borderBottom: i < activity.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <ActivityIcon type={row.type} />
                <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>
                  {row.type === 'leave' ? 'Leave request' : 'Feedback submitted'}
                </span>
                <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>{row.person}</span>
                <StatusPill status={row.status} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>{row.time}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--gray)', cursor: 'pointer' }}>···</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
