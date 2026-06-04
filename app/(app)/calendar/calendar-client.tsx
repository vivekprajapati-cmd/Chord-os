'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import type { BlockWithTask } from './page';
import ContextModal from '@/components/context-modal';
import { createClient } from '@/lib/supabase/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

const PRIORITY_STYLE: Record<string, CSSProperties> = {
  P0: { background: 'var(--red)', color: '#fff' },
  P1: { background: 'var(--ink)', color: 'var(--cream)' },
  P2: { background: 'var(--cream-2)', color: 'var(--ink)' },
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Upcoming',
  in_progress: 'In Progress',
  done: 'Done',
  ready_for_review: 'Review',
};

export default function CalendarClient({ personId, personName, isLead, googleConnected, blocks: initialBlocks }: {
  personId: string;
  personName: string;
  isLead: boolean;
  googleConnected: boolean;
  blocks: BlockWithTask[];
}) {
  const [blocks, setBlocks] = useState<BlockWithTask[]>(initialBlocks);
  const [selectedBlock, setSelectedBlock] = useState<BlockWithTask | null>(null);
  const [selectedDay, setSelectedDay] = useState(-1); // -1 = auto-select today on mount
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [mounted, setMounted] = useState(false);
  const [capacity, setCapacity] = useState<{ total_hours: number; blocked_hours: number; remaining_hours: number; utilization_pct?: number } | null>(null);

  useEffect(() => {
    const days = getWeekDays();
    setWeekDays(days);
    setMounted(true);
    // Auto-select today
    const todayIndex = days.findIndex(d => isSameDay(d, new Date()));
    if (todayIndex >= 0) setSelectedDay(todayIndex);
    // Fetch today's capacity
    fetch('/api/capacity')
      .then(r => r.json())
      .then(data => setCapacity(data))
      .catch(() => {});
  }, []);

  // Fetch Google Calendar events if connected
  useEffect(() => {
    if (!googleConnected || weekDays.length === 0) return;
    const weekStart = weekDays[0];
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);
    fetch(`/api/calendar/google-events?timeMin=${weekStart.toISOString()}&timeMax=${weekEnd.toISOString()}`)
      .then(r => r.json())
      .then(data => setGoogleEvents(data.events ?? []))
      .catch(() => {});
  }, [googleConnected, weekDays]);

  // Realtime: live-update blocks when someone assigns a new one
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`blocks-${personId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'blocks', filter: `person_id=eq.${personId}` },
        async (payload: { eventType: string; old: Record<string, string>; new: Record<string, string> }) => {
          if (payload.eventType === 'DELETE') {
            setBlocks((prev: BlockWithTask[]) => prev.filter((b: BlockWithTask) => b.id !== payload.old.id));
            return;
          }
          const { data } = await supabase
            .from('blocks')
            .select(`id, start_at, end_at, status, actual_hours, tasks(id, deliverable, task_type, priority, estimated_hours, notes, status, owner_id, reviewer_id, brands(id, slug, name, colors, typography, voice_summary), owner:people!tasks_owner_id_fkey(id, name), reviewer:people!tasks_reviewer_id_fkey(id, name), references:task_references(id, ref_type, url, caption))`)
            .eq('id', payload.new.id)
            .maybeSingle();
          if (!data) return;
          const newBlock = data as unknown as BlockWithTask;
          setBlocks((prev: BlockWithTask[]) => {
            const exists = prev.find((b: BlockWithTask) => b.id === newBlock.id);
            return exists
              ? prev.map((b: BlockWithTask) => b.id === newBlock.id ? newBlock : b)
              : [...prev, newBlock].sort((a: BlockWithTask, b: BlockWithTask) => a.start_at.localeCompare(b.start_at));
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [personId]);

  // default selected day = today
  const todayIdx = weekDays.findIndex(d => isSameDay(d, new Date()));
  const activeDayIndex = selectedDay >= 0 ? selectedDay : todayIdx;
  const activeDay = weekDays[activeDayIndex] ?? weekDays[0];

  const todayBlocks = blocks.filter((b: BlockWithTask) => activeDay && isSameDay(new Date(b.start_at), activeDay));
  const todayGoogleEvents = googleEvents.filter(e => e.start && activeDay && isSameDay(new Date(e.start), activeDay));

  if (!mounted) return null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">Calendar</p>
            <h1 className="font-display text-5xl uppercase tracking-tight">{personName}</h1>
            {capacity && (
              <div className="flex items-center gap-3 mt-2">
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>
                  Today: <strong style={{ color: capacity.remaining_hours === 0 ? 'var(--coral)' : 'var(--ink)' }}>{capacity.remaining_hours}h remaining</strong> of {capacity.total_hours}h
                </span>
                <div style={{ width: '80px', height: '4px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, capacity.utilization_pct ?? 0)}%`, height: '100%', background: (capacity.utilization_pct ?? 0) >= 100 ? 'var(--coral)' : 'var(--cobalt)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {googleConnected ? (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />
                Google Calendar connected
              </span>
            ) : (
              <a
                href="/api/auth/google"
                style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px', textDecoration: 'none', display: 'inline-block' }}
              >
                Connect Google Calendar
              </a>
            )}
            {isLead && (
              <span className="text-xs font-mono text-[var(--gray)]">Go to Chat to add blocks</span>
            )}
          </div>
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const blockCount = blocks.filter((b: BlockWithTask) => isSameDay(new Date(b.start_at), d)).length;
            const googleCount = googleEvents.filter(e => e.start && isSameDay(new Date(e.start), d)).length;
            const count = blockCount + googleCount;
            const isToday = isSameDay(d, new Date());
            const isActive = i === activeDayIndex;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className="flex flex-col items-center py-3 rounded-xl border transition"
                style={{
                  background: isActive ? 'var(--coral)' : 'var(--paper)',
                  color: isActive ? '#fff' : 'var(--ink)',
                  borderColor: isActive ? 'var(--coral)' : isToday ? 'var(--coral)' : 'var(--line)',
                }}
              >
                <span className="text-xs font-mono uppercase tracking-wider">{DAYS[i]}</span>
                <span className="font-display text-2xl mt-0.5">{d.getDate()}</span>
                {count > 0 && (
                  <span className="text-xs mt-1" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--gray)' }}>
                    {count} block{count !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day view */}
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">
            {activeDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>

          {todayBlocks.length === 0 && todayGoogleEvents.length === 0 ? (
            <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-10 text-center">
              <p className="text-[var(--gray)]">No blocks assigned for this day.</p>
              {isLead && <p className="text-xs text-[var(--gray)] mt-1 font-mono">Use Chat to add work.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Task blocks */}
              {todayBlocks.map((block) => (
                <button
                  key={block.id}
                  onClick={() => setSelectedBlock(block)}
                  className="w-full bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 shadow-[4px_4px_0_var(--ink)] hover:shadow-[6px_6px_0_var(--ink)] transition text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.1em] text-[var(--gray)]">
                        {block.tasks.brands.name}
                      </p>
                      <p className="font-display text-2xl uppercase tracking-tight mt-0.5">
                        {block.tasks.deliverable}
                      </p>
                    </div>
                    <span
                      className="text-xs font-mono uppercase px-2 py-1 rounded"
                      style={PRIORITY_STYLE[block.tasks.priority] ?? { background: 'var(--cream-2)' }}
                    >
                      {block.tasks.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-[var(--gray)]">
                    <span>{formatTime(block.start_at)} – {formatTime(block.end_at)}</span>
                    <span>{block.tasks.estimated_hours}h</span>
                    <span className="capitalize">{STATUS_LABEL[block.status] ?? block.status}</span>
                  </div>
                  <p className="text-xs font-mono text-[var(--cobalt)] mt-2 uppercase tracking-wider">
                    Tap to open context →
                  </p>
                </button>
              ))}

              {/* Google Calendar events */}
              {todayGoogleEvents.map((event) => (
                <div
                  key={event.id}
                  className="w-full bg-[var(--paper)] border rounded-2xl p-5 text-left"
                  style={{ borderColor: '#4285F4', borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-[0.1em]" style={{ color: '#4285F4' }}>
                        Google Calendar
                      </p>
                      <p className="font-display text-2xl uppercase tracking-tight mt-0.5">
                        {event.title}
                      </p>
                    </div>
                    {event.meetLink && (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#4285F4', color: '#fff', borderRadius: '999px', padding: '6px 12px', textDecoration: 'none', flexShrink: 0 }}
                      >
                        Join Meet
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-[var(--gray)]">
                    {!event.isAllDay && event.start && event.end && (
                      <span>{formatTime(event.start)} – {formatTime(event.end)}</span>
                    )}
                    {event.isAllDay && <span>All day</span>}
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedBlock && (
        <ContextModal
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </>
  );
}
