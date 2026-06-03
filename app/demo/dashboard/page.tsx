import Link from 'next/link';
import { MOCK_PERSON, MOCK_TASKS, MOCK_BLOCKS } from '@/lib/mock-data';

export default function DemoDashboardPage() {
  const person = MOCK_PERSON;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const todayBlocks = MOCK_BLOCKS.filter(b => {
    const s = new Date(b.start_at);
    return s >= todayStart && s <= todayEnd;
  });

  const inProgress = MOCK_TASKS.filter(t => t.status === 'in_progress');
  const reviewTasks = MOCK_TASKS.filter(t => t.status === 'ready_for_review');

  const h = new Date().getHours();
  const greeting = h < 12 ? "you're up early" : h < 17 ? "let's build" : 'wrapping up';

  const blocksToShow = todayBlocks.length > 0 ? todayBlocks : MOCK_BLOCKS;
  const blocksLabel = todayBlocks.length > 0 ? "Today's blocks" : "Coming up";

  return (
    <div className="space-y-12">
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {greeting}, <em style={{ fontFamily: 'var(--f-italic)', fontStyle: 'italic' }}>{person.name.split(' ')[0]}</em>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '12px', fontFamily: 'var(--f-mono)', opacity: 0.75 }}>
          {person.role} · {person.department}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard label="Blocks today" value={String(todayBlocks.length)} />
        <StatCard label="In progress" value={String(inProgress.length)} />
        <StatCard label="Awaiting approval" value={String(reviewTasks.length)} highlight={reviewTasks.length > 0} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">{blocksLabel}</p>
          <Link href="/demo/calendar" className="text-xs font-mono uppercase text-[var(--cobalt)] tracking-wider hover:opacity-70 transition-opacity">
            Full calendar →
          </Link>
        </div>
        <div className="space-y-2">
          {blocksToShow.map((block) => {
            const task = block.tasks;
            const start = new Date(block.start_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
            const end = new Date(block.end_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
            return (
              <Link
                key={block.id}
                href="/demo/calendar"
                className="flex items-center justify-between bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 hover:shadow-[4px_4px_0_var(--ink)] transition-shadow"
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono text-[var(--gray)] uppercase">{task.brands.name}</p>
                  <p className="font-medium truncate">{task.deliverable}</p>
                  <p className="text-xs font-mono text-[var(--gray)]">{start} – {end}</p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span
                    className="text-xs font-mono uppercase px-2 py-0.5 rounded"
                    style={
                      task.priority === 'P0' ? { background: 'var(--red)', color: '#fff' } :
                      task.priority === 'P1' ? { background: 'var(--ink)', color: 'var(--cream)' } :
                      { border: '1px solid var(--ink)' }
                    }
                  >{task.priority}</span>
                  <span className="text-xs font-mono text-[var(--gray)] capitalize">{block.status}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {reviewTasks.length > 0 && (
        <section>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--red)] mb-3">
            Awaiting your approval ({reviewTasks.length})
          </p>
          <Link
            href="/demo/tasks"
            className="block bg-[var(--paper)] border-2 border-[var(--red)] rounded-2xl p-5 hover:shadow-[4px_4px_0_var(--red)] transition-shadow"
          >
            <p className="font-medium text-[var(--red)]">
              {reviewTasks.length} task{reviewTasks.length > 1 ? 's' : ''} waiting for sign-off
            </p>
            <p className="text-xs font-mono text-[var(--gray)] mt-1">Tasks → Review queue →</p>
          </Link>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'var(--coral)' : 'var(--paper)',
      border: `1.5px solid ${highlight ? 'var(--ink)' : 'var(--line)'}`,
      borderRadius: '14px',
      padding: '24px',
      boxShadow: '6px 6px 0 var(--ink)',
    }}>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: highlight ? 'rgba(255,255,255,0.7)' : 'var(--gray)', marginBottom: '10px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 400, textTransform: 'uppercase', lineHeight: 1, color: highlight ? '#fff' : 'var(--ink)' }}>{value}</p>
    </div>
  );
}
