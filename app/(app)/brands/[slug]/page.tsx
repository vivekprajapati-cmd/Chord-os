import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import BrandEditButton from '@/components/brand-edit-button';
import BrandDocuments from '@/components/brand-documents';
import BrandTasksList from '@/components/brand-tasks-list';
import ClientFilesSection from '@/components/client-files-section';
import ClientAccountsList from '@/components/client-accounts-list';

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
  const { data: self } = await supabase.from('people').select('is_team_lead, access_tier').eq('email', user?.email ?? '').maybeSingle();
  const canLogMeeting = !!self?.is_team_lead;
  const tier = (self as any)?.access_tier ?? 'staff';
  const isAdminOrOps = tier === 'admin' || tier === 'operations';

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


  // Fetch brand documents + client accounts + client reviews
  const [brandDocsResult, clientAccountsResult, clientReviewsResult] = await Promise.all([
    supabase
      .from('brand_documents')
      .select('id, name, file_path, file_type, file_size, created_at, uploaded_by:people!brand_documents_uploaded_by_id_fkey(name)')
      .eq('brand_id', b.id)
      .order('created_at', { ascending: false }),
    isAdminOrOps
      ? createAdminClient().from('client_accounts').select('id, email, is_active').eq('brand_id', b.id).order('created_at')
      : Promise.resolve({ data: [] }),
    isAdminOrOps
      ? createAdminClient().from('client_reviews').select('id, type, message, created_at').eq('brand_id', b.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const brandDocs = brandDocsResult.data;
  const allClientAccounts = (clientAccountsResult.data ?? []) as { id: string; email: string; is_active: boolean }[];
  const clientReviews = (clientReviewsResult.data ?? []) as { id: string; type: string; message: string; created_at: string }[];
  const activeClientAccounts = allClientAccounts.filter(a => a.is_active);

  // Fetch client files for all active accounts in a single query
  const clientFilesMap: Record<string, any[]> = {};
  if (isAdminOrOps && activeClientAccounts.length > 0) {
    const activeIds = activeClientAccounts.map(a => a.id);
    const { data: allFiles } = await supabase
      .from('client_files')
      .select('id, file_name, file_url, created_at, client_account_id')
      .in('client_account_id', activeIds)
      .order('created_at', { ascending: false });
    (allFiles ?? []).forEach(f => {
      if (!clientFilesMap[f.client_account_id]) clientFilesMap[f.client_account_id] = [];
      clientFilesMap[f.client_account_id].push(f);
    });
  }

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
          {canLogMeeting && (
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


      {/* Performance dashboard */}
      <BrandPerformance
        brandId={b.id}
        supabase={supabase}
        accentColor={Object.values(colors)[0] ?? null}
      />

      {/* Brand documents */}
      <BrandDocuments
        brandId={b.id}
        brandSlug={b.slug}
        initialDocs={(brandDocs ?? []) as any}
        canUpload={canLogMeeting}
      />

      {/* Client logins — admin/operations only */}
      {isAdminOrOps && (
        <ClientAccountsList
          brandId={b.id}
          initialAccounts={allClientAccounts}
        />
      )}

      {/* Client files — admin/operations only */}
      {isAdminOrOps && (
        <ClientFilesSection
          brandId={b.id}
          clientAccounts={activeClientAccounts}
          initialFiles={clientFilesMap}
        />
      )}

      {/* Client reviews — admin/operations only */}
      {isAdminOrOps && clientReviews.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">
            Client Feedback ({clientReviews.length})
          </p>
          <div className="space-y-3">
            {clientReviews.map(r => (
              <div key={r.id} className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.08em] px-3 py-1 rounded-full border"
                    style={r.type === 'attention'
                      ? { background: 'rgba(220,50,50,0.08)', color: 'var(--red)', borderColor: 'var(--red)' }
                      : { background: 'rgba(13,13,11,0.06)', color: 'var(--ink)', borderColor: 'var(--line)' }
                    }
                  >
                    {r.type === 'attention' ? 'Flag Attention' : 'Review'}
                  </span>
                  <p className="text-[10px] font-mono text-[var(--gray)] shrink-0">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm leading-relaxed">{r.message}</p>
              </div>
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
    .select('id, deliverable, status, priority, deadline, task_type, owner:people!tasks_owner_id_fkey(name)')
    .eq('brand_id', brandId)
    .neq('status', 'cancelled')
    .order('deadline', { ascending: true });

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">
        All tasks {tasks && tasks.length > 0 ? `(${tasks.length})` : ''}
      </p>
      <BrandTasksList tasks={(tasks ?? []) as any[]} />
    </div>
  );
}

// ─── Brand Performance Dashboard ─────────────────────────────────────────────
const DEPT_MAP: { label: string; types: string[] }[] = [
  { label: 'Design',     types: ['design'] },
  { label: 'Video',      types: ['video'] },
  { label: 'Copy',       types: ['copy', 'content'] },
  { label: 'Operations', types: ['strategy', 'other'] },
];

const FY_START = '2025-04-01T00:00:00+05:30';

function computeStats(tasks: any[]) {
  const total          = tasks.length;
  const completed      = tasks.filter(t => t.status === 'approved').length;
  const pendingBacklog = total - completed;
  const pct            = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pendingBacklog, pct };
}

async function BrandPerformance({
  brandId,
  supabase,
  accentColor,
}: {
  brandId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  accentColor: string | null;
}) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, task_type')
    .eq('brand_id', brandId)
    .neq('status', 'cancelled')
    .gte('start_date', FY_START);

  const fyTasks = tasks ?? [];
  const overall = computeStats(fyTasks);
  const accent = accentColor ?? 'var(--ink)';

  const summaryCards = [
    { label: 'Total Allocated',  value: overall.total },
    { label: 'Completed',        value: overall.completed },
    { label: 'Pending Backlog',  value: overall.pendingBacklog },
    { label: 'Completion',       value: `${overall.pct}%` },
  ];

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-4">
        Delivery tracker · FY 2025–26
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summaryCards.map(({ label, value }) => (
          <div
            key={label}
            style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: '14px', padding: '18px 20px', boxShadow: `4px 4px 0 ${accent}` }}
          >
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--f-display)', fontSize: '36px', lineHeight: 1, color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Department breakdown table */}
      {fyTasks.length > 0 && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', padding: '10px 20px', background: 'var(--ink)' }}>
            {['Department', 'Assigned', 'Completed', 'Pending Backlog', '%'].map(h => (
              <p key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cream)' }}>{h}</p>
            ))}
          </div>
          {/* Department rows */}
          {DEPT_MAP.map(({ label, types }, i) => {
            const deptTasks = fyTasks.filter(t => types.includes(t.task_type));
            const s = computeStats(deptTasks);
            const isLast = i === DEPT_MAP.length - 1;
            return (
              <div
                key={label}
                style={{
                  display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)',
                  padding: '12px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--line)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(13,13,11,0.02)',
                }}
              >
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 600 }}>{label}</p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px' }}>{s.total}</p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: s.completed > 0 ? '#1a7a45' : 'var(--gray)' }}>{s.completed}</p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: s.pendingBacklog > 0 ? 'var(--coral)' : 'var(--gray)' }}>{s.pendingBacklog}</p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 600, color: s.pct >= 80 ? '#1a7a45' : s.pct >= 40 ? '#7a5c00' : 'var(--gray)' }}>
                  {s.total > 0 ? `${s.pct}%` : '—'}
                </p>
              </div>
            );
          })}
          {/* Total row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', padding: '12px 20px', borderTop: `2px solid var(--ink)`, background: 'rgba(13,13,11,0.03)' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700 }}>{overall.total}</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700, color: '#1a7a45' }}>{overall.completed}</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--coral)' }}>{overall.pendingBacklog}</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700 }}>{overall.pct}%</p>
          </div>
        </div>
      )}

      {fyTasks.length === 0 && (
        <p className="text-sm text-[var(--gray)]">No tasks found for FY 2025–26.</p>
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
