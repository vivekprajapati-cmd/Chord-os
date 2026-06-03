import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Decision = { text: string; impact: 'high' | 'medium' | 'low' };
type KnowledgeDelta = { rule: string; category: 'tone' | 'visual' | 'process' | 'hard_no' };

type Meeting = {
  id: string;
  meeting_date: string;
  ai_summary: string | null;
  decisions: Decision[];
  tasks_suggested: { deliverable: string; task_type: string; estimated_hours: number; priority: string }[];
  knowledge_delta: KnowledgeDelta[];
  tasks_confirmed: boolean;
  brand: { name: string; slug: string } | null;
  logged_by: { name: string } | null;
};

// Inline-safe category styles — avoids Tailwind v4 dynamic class issues
const CATEGORY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  tone:    { bg: 'rgba(34,38,217,0.07)',  color: '#2226D9',  border: 'rgba(34,38,217,0.2)'  },
  visual:  { bg: 'rgba(240,230,60,0.18)', color: '#5a4f00',  border: 'rgba(200,185,0,0.3)'  },
  process: { bg: 'rgba(10,10,10,0.05)',   color: '#7A7468',  border: 'rgba(10,10,10,0.12)'  },
  hard_no: { bg: 'rgba(255,59,47,0.08)',  color: '#FF3B2F',  border: 'rgba(255,59,47,0.2)'  },
};

function minutesAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default async function BriefingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const brandFilter = params.brand;

  let query = supabase
    .from('brand_meetings')
    .select('id, meeting_date, ai_summary, decisions, tasks_suggested, knowledge_delta, tasks_confirmed, brand:brands!brand_meetings_brand_id_fkey(name, slug), logged_by:people!brand_meetings_logged_by_id_fkey(name)')
    .order('meeting_date', { ascending: false })
    .limit(30);

  if (brandFilter) {
    const { data: b } = await supabase.from('brands').select('id').eq('slug', brandFilter).maybeSingle();
    if (b) query = query.eq('brand_id', b.id);
  }

  const { data: meetings } = await query;
  const { data: brands } = await supabase.from('brands').select('name, slug').eq('status', 'active').order('name');

  const all = (meetings ?? []) as unknown as Meeting[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-5xl uppercase tracking-tight">Briefings</h1>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <a
            href="/briefings"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '6px 14px',
              borderRadius: '999px',
              border: `1px solid ${!brandFilter ? 'var(--coral)' : 'var(--line)'}`,
              background: !brandFilter ? 'var(--coral)' : 'transparent',
              color: !brandFilter ? '#fff' : 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            All
          </a>
          {(brands ?? []).map((b: { name: string; slug: string }) => (
            <a
              key={b.slug}
              href={`/briefings?brand=${b.slug}`}
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '6px 14px',
                borderRadius: '999px',
                border: `1px solid ${brandFilter === b.slug ? 'var(--coral)' : 'var(--line)'}`,
                background: brandFilter === b.slug ? 'var(--coral)' : 'transparent',
                color: brandFilter === b.slug ? '#fff' : 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              {b.name}
            </a>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '8px', letterSpacing: '0.04em' }}>
          Meeting minutes — action items, decisions, knowledge updates
        </p>
      </div>

      {all.length === 0 && (
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-12 text-center">
          <p style={{ color: 'var(--gray)', fontSize: '14px' }}>No briefings yet.</p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '6px' }}>
            Go to a brand and hit <strong>+ Log meeting</strong> after your next client call.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {all.map(m => {
          const decisions = (m.decisions ?? []) as Decision[];
          const tasks = m.tasks_suggested ?? [];
          const kd = (m.knowledge_delta ?? []) as KnowledgeDelta[];
          const actionItems = decisions.filter(d => d.impact !== 'low');
          const highCount = decisions.filter(d => d.impact === 'high').length;

          return (
            <article
              key={m.id}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '4px 4px 0 var(--ink)',
              }}
            >
              {/* Header row */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {m.brand && (
                      <Link
                        href={`/brands/${m.brand.slug}`}
                        style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cobalt)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                      >
                        {m.brand.name} →
                      </Link>
                    )}
                    <span style={{ color: 'var(--line)', fontSize: '12px' }}>·</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                      {minutesAgo(m.meeting_date)}
                    </span>
                    {m.logged_by && (
                      <>
                        <span style={{ color: 'var(--line)', fontSize: '12px' }}>·</span>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                          {(m.logged_by as { name: string }).name}
                        </span>
                      </>
                    )}
                  </div>
                  {m.ai_summary && (
                    <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--ink)' }}>{m.ai_summary}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {highCount > 0 && (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--red)', textTransform: 'uppercase' }}>
                      {highCount} high-impact
                    </span>
                  )}
                  {tasks.length > 0 && (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                      {tasks.length} tasks
                    </span>
                  )}
                  {m.tasks_confirmed && (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', padding: '3px 10px', borderRadius: '999px' }}>
                      confirmed
                    </span>
                  )}
                </div>
              </div>

              {/* Action items */}
              {actionItems.length > 0 && (
                <div style={{ padding: '16px 24px', borderBottom: (kd.length > 0 || tasks.length > 0) ? '1px solid var(--line)' : undefined }}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '10px' }}>
                    Action items
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {actionItems.map((d, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span
                          style={{
                            marginTop: '6px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            flexShrink: 0,
                            ...(d.impact === 'high' ? { background: 'var(--red)' } : d.impact === 'medium' ? { background: 'var(--ink)' } : { background: 'var(--gray)' }),
                          }}
                        />
                        <span style={{ fontSize: '13px', lineHeight: 1.45, color: 'var(--ink)' }}>{d.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tasks + knowledge row */}
              {(tasks.length > 0 || kd.length > 0) && (
                <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  {tasks.length > 0 && (
                    <div>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '8px' }}>
                        Tasks ({tasks.length})
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {tasks.map((t, i) => (
                          <span key={i} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', border: '1px solid var(--line)', borderRadius: '8px', padding: '5px 10px', color: 'var(--ink)' }}>
                            <span style={{ color: 'var(--gray)', marginRight: '6px', fontSize: '9px', textTransform: 'uppercase' }}>{t.task_type}</span>
                            {t.deliverable}
                            <span style={{ color: 'var(--gray)', marginLeft: '6px' }}>{t.estimated_hours}h</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {kd.length > 0 && (
                    <div>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '8px' }}>
                        New rules
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {kd.map((k, i) => {
                          const s = CATEGORY_STYLE[k.category] ?? CATEGORY_STYLE.process;
                          return (
                            <span key={i} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '999px', padding: '4px 10px' }}>
                              <span style={{ opacity: 0.6, marginRight: '4px', fontSize: '9px', textTransform: 'uppercase' }}>{k.category}:</span>
                              {k.rule}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
