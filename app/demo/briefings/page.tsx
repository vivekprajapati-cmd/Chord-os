const MOCK_BRIEFINGS = [
  {
    id: 'b1',
    brand: { name: 'IndiaGate', slug: 'indiagate' },
    date: '2026-06-01',
    summary: 'Q3 campaign aligned on heritage positioning. Gold and navy palette locked. No competitor references in mood boards.',
    decisions: [
      { text: 'Launch date confirmed for 15 July', impact: 'high' },
      { text: 'All reels to be 30s max', impact: 'high' },
      { text: 'Avoid regional dialects in copy', impact: 'medium' },
    ],
    tasks: [
      { deliverable: 'Diwali Campaign — 3 Reels', task_type: 'video', estimated_hours: 6 },
      { deliverable: 'Heritage Landing Page Copy', task_type: 'copy', estimated_hours: 3 },
    ],
    rules: [
      { rule: 'Never use competitors in mood boards', category: 'hard_no' },
      { rule: 'Gold + navy are load-bearing — never swap', category: 'visual' },
    ],
  },
  {
    id: 'b2',
    brand: { name: 'AlphaKid', slug: 'alphakid' },
    date: '2026-05-28',
    summary: 'New product launch for back-to-school season. Bold, energetic visuals. Parents are primary decision-makers.',
    decisions: [
      { text: 'Focus on age 6-12 segment', impact: 'high' },
      { text: 'YouTube pre-roll + Instagram reels', impact: 'medium' },
    ],
    tasks: [
      { deliverable: 'YouTube Pre-roll Script', task_type: 'copy', estimated_hours: 2 },
      { deliverable: 'Instagram Reel — 3 variants', task_type: 'video', estimated_hours: 5 },
    ],
    rules: [
      { rule: 'Always show product in use by a child', category: 'visual' },
      { rule: 'Copy must pass parent trust test', category: 'tone' },
    ],
  },
];

const CATEGORY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  tone:    { bg: 'rgba(34,38,217,0.07)',  color: '#2226D9',  border: 'rgba(34,38,217,0.2)'  },
  visual:  { bg: 'rgba(240,230,60,0.18)', color: '#5a4f00',  border: 'rgba(200,185,0,0.3)'  },
  process: { bg: 'rgba(10,10,10,0.05)',   color: '#7A7468',  border: 'rgba(10,10,10,0.12)'  },
  hard_no: { bg: 'rgba(255,59,47,0.08)',  color: '#FF3B2F',  border: 'rgba(255,59,47,0.2)'  },
};

function daysAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function DemoBriefingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl uppercase tracking-tight">Briefings</h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '8px', letterSpacing: '0.04em' }}>
          Meeting minutes — action items, decisions, knowledge updates
        </p>
      </div>

      <div className="space-y-4">
        {MOCK_BRIEFINGS.map(m => {
          const highCount = m.decisions.filter(d => d.impact === 'high').length;
          return (
            <article key={m.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden', boxShadow: '4px 4px 0 var(--ink)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>{m.brand.name}</span>
                    <span style={{ color: 'var(--line)' }}>·</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>{daysAgo(m.date)}</span>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.55 }}>{m.summary}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0, marginLeft: '16px' }}>
                  {highCount > 0 && <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--red)', textTransform: 'uppercase' }}>{highCount} high-impact</span>}
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>{m.tasks.length} tasks</span>
                </div>
              </div>

              {/* Decisions */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '10px' }}>Action items</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {m.decisions.map((d, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: d.impact === 'high' ? 'var(--red)' : d.impact === 'medium' ? 'var(--ink)' : 'var(--gray)' }} />
                      <span style={{ fontSize: '13px', lineHeight: 1.45 }}>{d.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tasks + Rules */}
              <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '8px' }}>Tasks ({m.tasks.length})</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {m.tasks.map((t, i) => (
                      <span key={i} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', border: '1px solid var(--line)', borderRadius: '8px', padding: '5px 10px' }}>
                        <span style={{ color: 'var(--gray)', marginRight: '6px', fontSize: '9px', textTransform: 'uppercase' }}>{t.task_type}</span>
                        {t.deliverable}
                        <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>{t.estimated_hours}h</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '8px' }}>New rules</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {m.rules.map((r, i) => {
                      const s = CATEGORY_STYLE[r.category] ?? CATEGORY_STYLE.process;
                      return (
                        <span key={i} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '999px', padding: '4px 10px' }}>
                          <span style={{ opacity: 0.6, marginRight: '4px', fontSize: '9px', textTransform: 'uppercase' }}>{r.category}:</span>
                          {r.rule}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
