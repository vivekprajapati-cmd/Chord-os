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

export default function CalendarClient({ personId, personName, isLead, blocks: initialBlocks }: {
  personId: string;
  personName: string;
  isLead: boolean;
  blocks: BlockWithTask[];
}) {
  const [blocks, setBlocks] = useState<BlockWithTask[]>(initialBlocks);
  const [selectedBlock, setSelectedBlock] = useState<BlockWithTask | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const weekDays = getWeekDays();

  // Realtime: live-update blocks when someone assigns a new one
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`blocks-${personId}`)
      .on(
        'postgres_changes',
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
  const activeDay = weekDays[selectedDay] ?? weekDays[todayIdx];

  const todayBlocks = blocks.filter((b: BlockWithTask) => isSameDay(new Date(b.start_at), activeDay));

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">Calendar</p>
            <h1 className="font-display text-5xl uppercase tracking-tight">{personName}</h1>
          </div>
          {isLead && (
            <span className="text-xs font-mono text-[var(--gray)]">Go to Chat to add blocks</span>
          )}
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const count = blocks.filter((b: BlockWithTask) => isSameDay(new Date(b.start_at), d)).length;
            const isToday = isSameDay(d, new Date());
            const isActive = i === selectedDay;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className="flex flex-col items-center py-3 rounded-xl border transition"
                style={{
                  background: isActive ? 'var(--ink)' : 'var(--paper)',
                  color: isActive ? 'var(--cream)' : 'var(--ink)',
                  borderColor: isActive ? 'var(--ink)' : isToday ? 'var(--ink)' : 'var(--line)',
                }}
              >
                <span className="text-xs font-mono uppercase tracking-wider">{DAYS[i]}</span>
                <span className="font-display text-2xl mt-0.5">{d.getDate()}</span>
                {count > 0 && (
                  <span className="text-xs mt-1" style={{ color: isActive ? 'rgba(242,235,217,0.6)' : 'var(--gray)' }}>
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

          {todayBlocks.length === 0 ? (
            <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-10 text-center">
              <p className="text-[var(--gray)]">No blocks assigned for this day.</p>
              {isLead && <p className="text-xs text-[var(--gray)] mt-1 font-mono">Use Chat to add work.</p>}
            </div>
          ) : (
            <div className="space-y-3">
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
