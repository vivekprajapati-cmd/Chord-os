'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import TaskDetailModal from '@/components/task-detail-modal';

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  task_id: string | null;
  tasks: { id: string; deliverable: string; priority: string; estimated_hours: number; brands: { name: string } } | null;
};

type Person = {
  id: string;
  name: string;
  role: string;
  department: string;
  is_team_lead: boolean;
  default_hours_per_day: number;
};

export default function DashboardClient() {
  const [person, setPerson] = useState<Person | null>(null);
  const [todayBlocks, setTodayBlocks] = useState<Block[]>([]);
  const [upcomingBlocks, setUpcomingBlocks] = useState<Block[]>([]);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: p } = await supabase
        .from('people')
        .select('id, name, role, department, is_team_lead, default_hours_per_day')
        .eq('email', session.user.email!)
        .maybeSingle();

      if (!p) return;
      setPerson(p);
      setCanDelete(!!p.is_team_lead);

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const nowIST = new Date(Date.now() + IST_OFFSET_MS);
      const istDateStr = nowIST.toISOString().split('T')[0];
      const todayStart = new Date(`${istDateStr}T00:00:00+05:30`);
      const todayEnd = new Date(`${istDateStr}T23:59:59+05:30`);
      const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

      const isLead = !!p.is_team_lead;

      const [
        { data: tb },
        { data: ub },
        { data: ip },
        { data: rv },
      ] = await Promise.all([
        supabase
          .from('blocks')
          .select('id, start_at, end_at, status, task_id, tasks(id, deliverable, priority, estimated_hours, brands(name))')
          .eq('person_id', p.id)
          .gte('start_at', todayStart.toISOString())
          .lte('start_at', todayEnd.toISOString())
          .neq('status', 'cancelled')
          .order('start_at'),
        supabase
          .from('blocks')
          .select('id, start_at, end_at, status, task_id, tasks(id, deliverable, priority, estimated_hours, brands(name))')
          .eq('person_id', p.id)
          .gt('start_at', todayEnd.toISOString())
          .lte('start_at', weekEnd.toISOString())
          .neq('status', 'cancelled')
          .order('start_at')
          .limit(5),
        supabase.from('tasks').select('id').eq('owner_id', p.id).eq('status', 'in_progress'),
        isLead
          ? supabase.from('tasks').select('id').eq('status', 'ready_for_review')
          : supabase.from('tasks').select('id').eq('owner_id', p.id).eq('status', 'ready_for_review'),
      ]);

      setTodayBlocks((tb ?? []) as unknown as Block[]);
      setUpcomingBlocks((ub ?? []) as unknown as Block[]);
      setInProgressCount(ip?.length ?? 0);
      setReviewCount(rv?.length ?? 0);
      setLoading(false);
    }

    load();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "you're up early";
    if (h < 17) return "let's build";
    return 'wrapping up';
  })();

  const isLead = !!person?.is_team_lead;
  const hasToday = todayBlocks.length > 0;
  const blocksToShow = hasToday ? todayBlocks : upcomingBlocks;
  const blocksLabel = hasToday ? "Today's blocks" : "Coming up";
  const defaultHours = person?.default_hours_per_day ?? 9;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const istDateStr = nowIST.toISOString().split('T')[0];
  const dayStartMs = new Date(`${istDateStr}T00:00:00+05:30`).getTime();
  const dayEndMs = new Date(`${istDateStr}T23:59:59+05:30`).getTime();
  const blockedHoursToday = Math.round(todayBlocks.reduce((acc, b) => {
    const overlapStart = Math.max(new Date(b.start_at).getTime(), dayStartMs);
    const overlapEnd = Math.min(new Date(b.end_at).getTime(), dayEndMs);
    return acc + Math.max(0, (overlapEnd - overlapStart) / 3600000);
  }, 0) * 10) / 10;
  const remainingHoursToday = Math.max(0, defaultHours - blockedHoursToday);

  if (loading) {
    return (
      <div className="space-y-12">
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
          <div className="h-3 w-32 bg-[var(--line)] rounded animate-pulse mb-3" />
          <div className="h-16 w-72 bg-[var(--line)] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[var(--line)] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--line)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5">
        <StatCard label="Blocks today" value={String(todayBlocks.length)} />
        <StatCard label="In progress" value={String(inProgressCount)} />
        <StatCard label="Hours remaining" value={`${remainingHoursToday}h`} highlight={remainingHoursToday === 0} />
        <StatCard label={isLead ? 'Awaiting approval' : 'Needs review'} value={String(reviewCount)} highlight={reviewCount > 0} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">{blocksLabel}</p>
          <Link href="/calendar" className="text-xs font-mono uppercase text-[var(--cobalt)] tracking-wider hover:opacity-70 transition-opacity">
            Full calendar →
          </Link>
        </div>

        {blocksToShow.length === 0 ? (
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
            {blocksToShow.map((block) => {
              const task = block.tasks;
              const start = new Date(block.start_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
              const end = new Date(block.end_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
              const dayLabel = !hasToday
                ? new Date(block.start_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · '
                : '';
              const taskId = (task as any)?.id ?? block.task_id;
              return (
                <div
                  key={block.id}
                  onClick={() => taskId && setSelectedTaskId(taskId)}
                  className="flex items-center justify-between bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 hover:shadow-[4px_4px_0_var(--ink)] transition-shadow"
                  style={{ cursor: taskId ? 'pointer' : 'default' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[var(--gray)] uppercase">{(task as any)?.brands?.name}</p>
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
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reviewCount > 0 && (
        <section>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--red)] mb-3">
            {isLead ? 'Awaiting your approval' : 'Needs your review'} ({reviewCount})
          </p>
          <Link
            href="/tasks?status=ready_for_review"
            className="block bg-[var(--paper)] border-2 border-[var(--red)] rounded-2xl p-5 hover:shadow-[4px_4px_0_var(--red)] transition-shadow"
          >
            <p className="font-medium text-[var(--red)]">
              {reviewCount} task{reviewCount > 1 ? 's' : ''} waiting for sign-off
            </p>
            <p className="text-xs font-mono text-[var(--gray)] mt-1">Tasks → Review queue →</p>
          </Link>
        </section>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          canDelete={canDelete}
          onDeleted={() => { setSelectedTaskId(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'var(--coral)' : 'var(--paper)',
      border: `1.5px solid var(--coral)`,
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