import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, name, role, department, is_team_lead, default_hours_per_day')
    .eq('email', user!.email!)
    .maybeSingle();

  // After running access-tier.sql: swap is_team_lead for access_tier and update this derivation
  const tier = (person?.is_team_lead ? 'admin' : 'staff') as 'admin' | 'poc' | 'staff';
  const isLead = tier === 'admin';
  const canSeeAllTasks = isLead;

  // IST boundaries — UTC+5:30
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const istDateStr = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST
  const todayStart = new Date(`${istDateStr}T00:00:00+05:30`);
  const todayEnd = new Date(`${istDateStr}T23:59:59+05:30`);

  // Week end for upcoming blocks
  const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    { data: todayBlocks },
    { data: upcomingBlocks },
    { data: inProgressTasks },
    { data: reviewTasks },
  ] = await Promise.all([
    supabase
      .from('blocks')
      .select('id, start_at, end_at, status, tasks(deliverable, priority, estimated_hours, brands(name))')
      .eq('person_id', person?.id)
      .gte('start_at', todayStart.toISOString())
      .lte('start_at', todayEnd.toISOString())
      .neq('status', 'cancelled')
      .order('start_at'),
    // Upcoming 7 days — shown if today is empty
    supabase
      .from('blocks')
      .select('id, start_at, end_at, status, tasks(deliverable, priority, estimated_hours, brands(name))')
      .eq('person_id', person?.id)
      .gt('start_at', todayEnd.toISOString())
      .lte('start_at', weekEnd.toISOString())
      .neq('status', 'cancelled')
      .order('start_at')
      .limit(5),
    supabase
      .from('tasks')
      .select('id')
      .eq('owner_id', person?.id)
      .eq('status', 'in_progress'),
    // Admin + POC see ALL ready_for_review tasks; staff see none (they submit, not review)
    canSeeAllTasks
      ? supabase.from('tasks').select('id').eq('status', 'ready_for_review')
      : supabase.from('tasks').select('id').eq('owner_id', person?.id).eq('status', 'ready_for_review'),
  ]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "you're up early";
    if (h < 17) return "let's build";
    return 'wrapping up';
  })();

  const hasToday = (todayBlocks?.length ?? 0) > 0;
  const blocksToShow = hasToday ? todayBlocks : upcomingBlocks;
  const blocksLabel = hasToday ? "Today's blocks" : "Coming up";

  // Calculate today's capacity
  const defaultHours = (person as any)?.default_hours_per_day ?? 9;
  const blockedHoursToday = (todayBlocks ?? []).reduce((acc, b) => {
    return acc + ((b.tasks as any)?.estimated_hours ?? 0);
  }, 0);
  const remainingHoursToday = Math.max(0, defaultHours - blockedHoursToday);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {greeting}, <em style={{ fontFamily: 'var(--f-italic)', fontStyle: 'italic' }}>{person?.name?.split(' ')[0] ?? 'team'}</em>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '12px', fontFamily: 'var(--f-mono)', opacity: 0.75 }}>
          {person?.role} · {person?.department}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5">
        <StatCard label="Blocks today" value={String(todayBlocks?.length ?? 0)} />
        <StatCard label="In progress" value={String(inProgressTasks?.length ?? 0)} />
        <StatCard
          label="Hours remaining"
          value={`${remainingHoursToday}h`}
          highlight={remainingHoursToday === 0}
        />
        <StatCard
          label={isLead ? 'Awaiting approval' : 'Needs review'}
          value={String(reviewTasks?.length ?? 0)}
          highlight={(reviewTasks?.length ?? 0) > 0}
        />
      </div>

      {/* Today / upcoming blocks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">{blocksLabel}</p>
          <Link href="/calendar" className="text-xs font-mono uppercase text-[var(--cobalt)] tracking-wider hover:opacity-70 transition-opacity">
            Full calendar →
          </Link>
        </div>

        {!blocksToShow || blocksToShow.length === 0 ? (
          <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-8 text-center">
            <p className="text-[var(--gray)] text-sm">No blocks this week.</p>
            {isLead && (
              <Link href="/chat" className="text-xs font-mono uppercase text-[var(--cobalt)] mt-2 block hover:opacity-70 transition-opacity">
                Assign work via Allocator →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(blocksToShow as any[]).map((block) => {
              const task = block.tasks;
              const start = new Date(block.start_at).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
              });
              const end = new Date(block.end_at).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
              });
              const dayLabel = !hasToday
                ? new Date(block.start_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · '
                : '';
              return (
                <Link
                  key={block.id}
                  href="/calendar"
                  className="flex items-center justify-between bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 hover:shadow-[4px_4px_0_var(--ink)] transition-shadow"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[var(--gray)] uppercase">{task?.brands?.name}</p>
                    <p className="font-medium truncate">{task?.deliverable}</p>
                    <p className="text-xs font-mono text-[var(--gray)]">{dayLabel}{start} – {end}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span
                      className="text-xs font-mono uppercase px-2 py-0.5 rounded"
                      style={
                        task?.priority === 'P0' ? { background: 'var(--red)', color: '#fff' } :
                        task?.priority === 'P1' ? { background: 'var(--ink)', color: 'var(--cream)' } :
                        { border: '1px solid var(--ink)' }
                      }
                    >{task?.priority}</span>
                    <span className="text-xs font-mono text-[var(--gray)] capitalize">{block.status}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Review queue banner */}
      {(reviewTasks?.length ?? 0) > 0 && (
        <section>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--red)] mb-3">
            {isLead ? 'Awaiting your approval' : 'Needs your review'} ({reviewTasks?.length})
          </p>
          <Link
            href="/tasks?status=ready_for_review"
            className="block bg-[var(--paper)] border-2 border-[var(--red)] rounded-2xl p-5 hover:shadow-[4px_4px_0_var(--red)] transition-shadow"
          >
            <p className="font-medium text-[var(--red)]">
              {reviewTasks?.length} task{(reviewTasks?.length ?? 0) > 1 ? 's' : ''} waiting for sign-off
            </p>
            <p className="text-xs font-mono text-[var(--gray)] mt-1">Tasks → Review queue →</p>
          </Link>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight = false }: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? 'var(--coral)' : 'var(--paper)',
      border: `1.5px solid ${highlight ? 'var(--coral)' : 'var(--coral)'}`,
      borderRadius: '14px',
      padding: '24px',
      boxShadow: '4px 4px 0 var(--coral)',
    }}>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: highlight ? 'rgba(255,255,255,0.7)' : 'var(--gray)', marginBottom: '10px' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 1, color: highlight ? '#fff' : 'var(--ink)' }}>
        {value}
      </p>
    </div>
  );
}
