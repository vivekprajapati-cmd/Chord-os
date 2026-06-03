import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandEditButton from '@/components/brand-edit-button';

type Brand = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tier: string;
  typography: Record<string, string>;
  colors: Record<string, string>;
  voice_summary: string | null;
  knowledge: {
    rules: { rule: string; category: string; date: string }[];
    rejections: { description: string; reason: string; date: string }[];
    approvals: { description: string; date: string }[];
    contacts: { name: string; role: string }[];
  } | null;
  account_lead: { name: string; role: string } | null;
};

type Meeting = {
  id: string;
  meeting_date: string;
  ai_summary: string | null;
  tasks_suggested: unknown[];
  knowledge_delta: { rule: string; category: string }[];
  logged_by: { name: string } | null;
};

const CATEGORY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  tone:    { bg: 'rgba(34,38,217,0.07)',  color: '#2226D9', border: 'rgba(34,38,217,0.2)'  },
  visual:  { bg: 'rgba(240,230,60,0.18)', color: '#5a4f00', border: 'rgba(200,185,0,0.3)'  },
  process: { bg: 'rgba(10,10,10,0.05)',   color: '#7A7468', border: 'rgba(10,10,10,0.12)'  },
  hard_no: { bg: 'rgba(255,59,47,0.08)',  color: '#FF3B2F', border: 'rgba(255,59,47,0.2)'  },
};

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: self } = await supabase.from('people').select('is_team_lead').eq('email', user?.email ?? '').maybeSingle();
  const canLogMeeting = !!self?.is_team_lead;

  const [brandResult] = await Promise.all([
    supabase
      .from('brands')
      .select('id, slug, name, category, tier, typography, colors, voice_summary, knowledge, account_lead:people!brands_account_lead_id_fkey(name, role)')
      .eq('slug', slug)
      .maybeSingle(),
  ]);

  if (!brandResult.data) notFound();

  const b = brandResult.data as unknown as Brand;
  const colors = b.colors ?? {};
  const typography = b.typography ?? {};
  const knowledge = b.knowledge;

  // Fetch meetings separately since the subquery above might not work cleanly
  const { data: brandMeetings } = await supabase
    .from('brand_meetings')
    .select('id, meeting_date, ai_summary, tasks_suggested, knowledge_delta, logged_by:people!brand_meetings_logged_by_id_fkey(name)')
    .eq('brand_id', b.id)
    .order('meeting_date', { ascending: false })
    .limit(5);

  const recentMeetings = (brandMeetings ?? []) as unknown as Meeting[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-1">
            {b.category}
          </p>
          <h1 className="font-display text-7xl uppercase tracking-tight">{b.name}</h1>
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-xs font-mono uppercase border border-[var(--ink)] rounded-full px-3 py-1.5">
            {b.tier}
          </span>
          {canLogMeeting && (
            <>
              <BrandEditButton brand={{
                id: b.id,
                slug: b.slug,
                name: b.name,
                category: b.category,
                tier: b.tier,
                voice_summary: b.voice_summary,
                colors: b.colors ?? {},
                typography: b.typography ?? {},
              }} />
              <Link
                href={`/brands/${slug}/meeting`}
                className="text-xs font-mono uppercase tracking-[0.12em] px-5 py-2 rounded-full hover:opacity-90 transition shadow-[4px_4px_0_var(--gray)]"
                style={{ background: 'var(--ink)', color: 'var(--cream)' }}
              >
                + Log meeting
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Brand basics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card label="Account Lead">
          <p className="font-medium">{b.account_lead?.name ?? '—'}</p>
          <p className="text-sm text-[var(--gray)]">{b.account_lead?.role ?? ''}</p>
        </Card>

        <Card label="Brand Colors">
          {Object.keys(colors).length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {Object.entries(colors).map(([name, hex]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border border-[var(--line)]" style={{ background: hex }} />
                  <div>
                    <p className="text-xs font-mono">{hex}</p>
                    <p className="text-[10px] text-[var(--gray)] uppercase">{name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--gray)]">Not set — add via brand pack</p>
          )}
        </Card>

        <Card label="Typography">
          {Object.keys(typography).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(typography).map(([role, font]) => (
                <p key={role} className="text-sm">
                  <span className="text-[var(--gray)] font-mono text-xs uppercase">{role}:</span>{' '}
                  {font}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--gray)]">Not set</p>
          )}
        </Card>
      </div>

      {/* Tone & Voice */}
      <Card label="Tone & Voice">
        {b.voice_summary ? (
          <p className="text-sm leading-relaxed">{b.voice_summary}</p>
        ) : (
          <p className="text-sm text-[var(--gray)]">Not set. Log a meeting to extract tone rules automatically.</p>
        )}
      </Card>

      {/* Brand Brain / Knowledge */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">
            Brand brain — accumulated knowledge
          </p>
          {(!knowledge?.rules || knowledge.rules.length === 0) && (
            <Link href={`/brands/${slug}/meeting`} className="text-xs font-mono text-[var(--cobalt)] hover:underline">
              Log first meeting →
            </Link>
          )}
        </div>

        {knowledge?.rules && knowledge.rules.length > 0 ? (
          <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)]">
            <div className="flex flex-wrap gap-2">
              {knowledge.rules.map((r, i) => {
                const s = CATEGORY_STYLE[r.category] ?? CATEGORY_STYLE.process;
                return (
                  <span
                    key={i}
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    className="text-xs font-mono px-3 py-1.5 rounded-full"
                  >
                    <span className="uppercase opacity-60 mr-1">{r.category}:</span>
                    {r.rule}
                  </span>
                );
              })}
            </div>
            {knowledge.contacts && knowledge.contacts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-2">Client contacts</p>
                <div className="flex flex-wrap gap-3">
                  {knowledge.contacts.map((c, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[var(--gray)]"> — {c.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--gray)]">No knowledge yet.</p>
            <p className="text-xs text-[var(--gray)] mt-1 font-mono">After each client meeting, log it here. Claude extracts rules + tasks automatically.</p>
          </div>
        )}
      </div>

      {/* Recent meetings */}
      {recentMeetings.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">
            Meeting history ({recentMeetings.length})
          </p>
          <div className="space-y-3">
            {recentMeetings.map(m => (
              <Link
                key={m.id}
                href={`/briefings?brand=${b.slug}`}
                className="block bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5 hover:shadow-[4px_4px_0_var(--ink)] transition-shadow"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-mono text-[var(--gray)]">
                    {new Date(m.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {m.logged_by?.name && ` · logged by ${(m.logged_by as { name: string }).name}`}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--gray)]">
                    <span>{(m.tasks_suggested as unknown[])?.length ?? 0} tasks</span>
                    <span>{(m.knowledge_delta as unknown[])?.length ?? 0} rules</span>
                  </div>
                </div>
                {m.ai_summary && (
                  <p className="text-sm text-[var(--gray)] leading-relaxed">{m.ai_summary}</p>
                )}
                <p className="text-xs font-mono text-[var(--cobalt)] mt-2">View in briefings →</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active tasks */}
      <BrandTasks brandId={b.id} supabase={supabase} />
    </div>
  );
}

async function BrandTasks({
  brandId,
  supabase,
}: {
  brandId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, deliverable, status, priority, deadline, brief, owner:people!tasks_owner_id_fkey(name)')
    .eq('brand_id', brandId)
    .in('status', ['scheduled', 'in_progress', 'ready_for_review'])
    .order('deadline', { ascending: true })
    .limit(20);

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">Active tasks</p>
      {!tasks || tasks.length === 0 ? (
        <p className="text-sm text-[var(--gray)]">No active tasks. Log a meeting to generate them.</p>
      ) : (
        <div className="space-y-2">
          {(tasks as any[]).map((t) => (
            <div
              key={t.id}
              className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium">{t.deliverable}</p>
                  <p className="text-xs text-[var(--gray)] mt-0.5">
                    {t.owner?.name}
                    {t.deadline && ` · due ${new Date(t.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                  {t.brief && (
                    <p className="text-xs text-[var(--gray)] mt-2 leading-relaxed border-l-2 border-[var(--line)] pl-3 italic">
                      {t.brief.length > 160 ? t.brief.slice(0, 160) + '…' : t.brief}
                    </p>
                  )}
                </div>
                <span className="text-xs font-mono uppercase border border-[var(--ink)] rounded px-2 py-0.5 shrink-0">
                  {t.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)]">
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">{label}</p>
      {children}
    </div>
  );
}
