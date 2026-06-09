'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import type { BlockWithTask, TeamMember } from './page';
import ContextModal from '@/components/context-modal';
import { createClient } from '@/lib/supabase/client';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_START = 8;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const CELL_H = 60; // px per hour
const GRID_H = TOTAL_HOURS * CELL_H;

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

const BRAND_COLORS = [
  '#E55D4A', '#2226D9', '#2a9d5c', '#e9c46a',
  '#264653', '#e76f51', '#457b9d', '#6d6875', '#f4a261', '#a8dadc',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function brandColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

function getWeekStart(offset = 0): Date {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDays(offset = 0): Date[] {
  const ws = getWeekStart(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function blockTopPx(iso: string): number {
  const d = new Date(iso);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return Math.max(0, (h - HOUR_START) * CELL_H);
}

function blockHeightPx(startIso: string, endIso: string): number {
  const dur = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3600000;
  return Math.max(20, dur * CELL_H);
}

function hourLabel(h: number) {
  const hr = h % 12 || 12;
  return `${hr}${h < 12 ? 'am' : 'pm'}`;
}

// ─── Brand breakdown ─────────────────────────────────────────────────────────
function brandBreakdown(blocks: BlockWithTask[]): { name: string; hours: number; count: number }[] {
  const map: Record<string, { hours: number; count: number }> = {};
  blocks.forEach(b => {
    const name = b.tasks.brands.name;
    if (!map[name]) map[name] = { hours: 0, count: 0 };
    map[name].hours += b.tasks.estimated_hours ?? 0;
    map[name].count += 1;
  });
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.hours - a.hours);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarClient({
  personId: myPersonId,
  personName: myPersonName,
  isLead,
  isAdmin,
  googleConnected,
  blocks: initialBlocks,
  teamMembers,
  defaultHoursPerDay,
}: {
  personId: string;
  personName: string;
  isLead: boolean;
  isAdmin: boolean;
  googleConnected: boolean;
  blocks: BlockWithTask[];
  teamMembers: TeamMember[];
  defaultHoursPerDay: number;
}) {
  const supabase = createClient();
  const canSwitch = isAdmin || isLead;

  // ── Core state ───────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [selectedDay, setSelectedDay] = useState(-1); // -1 = today
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ── Person switcher ──────────────────────────────────────────────────────
  const [selectedPersonId, setSelectedPersonId] = useState(myPersonId);
  const [selectedPersonName, setSelectedPersonName] = useState(myPersonName);
  const [selectedPersonHours, setSelectedPersonHours] = useState(defaultHoursPerDay);
  const [blocks, setBlocks] = useState<BlockWithTask[]>(initialBlocks);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // ── Google / capacity ────────────────────────────────────────────────────
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<{ total_hours: number; blocked_hours: number; remaining_hours: number; utilization_pct?: number } | null>(null);

  // ── Context modal ────────────────────────────────────────────────────────
  const [selectedBlock, setSelectedBlock] = useState<BlockWithTask | null>(null);

  // ── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const days = getWeekDays(0);
    setWeekDays(days);
    setMounted(true);
    const todayIdx = days.findIndex(d => isSameDay(d, new Date()));
    if (todayIdx >= 0) setSelectedDay(todayIdx);
    fetch(`/api/capacity?person_id=${myPersonId}`)
      .then(r => r.json())
      .then(data => setCapacity(data))
      .catch(() => {});
  }, []);

  // ── Week navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const days = getWeekDays(weekOffset);
    setWeekDays(days);
    // keep selected day clamped
    if (weekOffset !== 0) setSelectedDay(0);
    else {
      const todayIdx = days.findIndex(d => isSameDay(d, new Date()));
      if (todayIdx >= 0) setSelectedDay(todayIdx);
    }
  }, [weekOffset]);

  // ── Fetch blocks ─────────────────────────────────────────────────────────
  const fetchBlocks = useCallback(async (pid: string, offset: number) => {
    setLoadingBlocks(true);
    const ws = getWeekStart(offset);
    const we = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data } = await supabase
      .from('blocks')
      .select(`
        id, start_at, end_at, status, actual_hours,
        tasks (
          id, deliverable, task_type, priority, estimated_hours, notes, status, owner_id, reviewer_id,
          brands ( id, slug, name, colors, typography, voice_summary ),
          owner:people!tasks_owner_id_fkey ( id, name ),
          reviewer:people!tasks_reviewer_id_fkey ( id, name ),
          references:task_references ( id, ref_type, url, caption )
        )
      `)
      .eq('person_id', pid)
      .gte('start_at', ws.toISOString())
      .lt('start_at', we.toISOString())
      .neq('status', 'cancelled')
      .order('start_at', { ascending: true });
    setBlocks((data ?? []) as unknown as BlockWithTask[]);
    setLoadingBlocks(false);
  }, [supabase]);

  // Fetch when person or week changes (skip very first render — we have server data)
  const [isFirstRender, setIsFirstRender] = useState(true);
  useEffect(() => {
    if (!mounted) return;
    if (isFirstRender) { setIsFirstRender(false); return; }
    fetchBlocks(selectedPersonId, weekOffset);
  }, [selectedPersonId, weekOffset, mounted]);

  // ── Google Calendar events ───────────────────────────────────────────────
  useEffect(() => {
    if (!googleConnected || weekDays.length === 0 || selectedPersonId !== myPersonId) return;
    const weekStart = weekDays[0];
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);
    fetch(`/api/calendar/google-events?timeMin=${weekStart.toISOString()}&timeMax=${weekEnd.toISOString()}`)
      .then(r => r.json())
      .then(data => setGoogleEvents(data.events ?? []))
      .catch(() => {});
  }, [googleConnected, weekDays, selectedPersonId, myPersonId]);

  // ── Realtime (always for the logged-in user's own blocks) ────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`blocks-${myPersonId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'blocks', filter: `person_id=eq.${myPersonId}` },
        async (payload: { eventType: string; old: Record<string, string>; new: Record<string, string> }) => {
          if (selectedPersonId !== myPersonId) return; // only update if viewing own calendar
          if (payload.eventType === 'DELETE') {
            setBlocks(prev => prev.filter(b => b.id !== payload.old.id));
            return;
          }
          const { data } = await supabase
            .from('blocks')
            .select(`id, start_at, end_at, status, actual_hours, tasks(id, deliverable, task_type, priority, estimated_hours, notes, status, owner_id, reviewer_id, brands(id, slug, name, colors, typography, voice_summary), owner:people!tasks_owner_id_fkey(id, name), reviewer:people!tasks_reviewer_id_fkey(id, name), references:task_references(id, ref_type, url, caption))`)
            .eq('id', payload.new.id)
            .maybeSingle();
          if (!data) return;
          const newBlock = data as unknown as BlockWithTask;
          setBlocks(prev => {
            const exists = prev.find(b => b.id === newBlock.id);
            return exists
              ? prev.map(b => b.id === newBlock.id ? newBlock : b)
              : [...prev, newBlock].sort((a, b) => a.start_at.localeCompare(b.start_at));
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myPersonId, selectedPersonId, supabase]);

  // ── Person switch ────────────────────────────────────────────────────────
  function handlePersonChange(pid: string) {
    const member = teamMembers.find(m => m.id === pid);
    setSelectedPersonId(pid);
    setSelectedPersonName(member?.name ?? '');
    setSelectedPersonHours(member?.default_hours_per_day ?? defaultHoursPerDay);
    fetch(`/api/capacity?person_id=${pid}`)
      .then(r => r.json())
      .then(data => setCapacity(data))
      .catch(() => {});
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const todayIdx = weekDays.findIndex(d => isSameDay(d, new Date()));
  const activeDayIndex = selectedDay >= 0 ? selectedDay : todayIdx;
  const activeDay = weekDays[activeDayIndex] ?? weekDays[0];

  const todayBlocks = blocks.filter(b => activeDay && isSameDay(new Date(b.start_at), activeDay));
  const todayGoogleEvents = (selectedPersonId === myPersonId ? googleEvents : []).filter(
    e => e.start && activeDay && isSameDay(new Date(e.start), activeDay)
  );

  // Overbooked: sum hours per day
  const dayHours: Record<string, number> = {};
  blocks.forEach(b => {
    const key = new Date(b.start_at).toDateString();
    const dur = (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 3600000;
    dayHours[key] = (dayHours[key] ?? 0) + dur;
  });
  function isOverbooked(d: Date) {
    return (dayHours[d.toDateString()] ?? 0) > selectedPersonHours;
  }

  // Weekly totals
  const totalWeekHours = blocks.reduce((sum, b) => {
    return sum + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 3600000;
  }, 0);
  const totalWeekCapacity = selectedPersonHours * 5; // Mon-Fri
  const weekUtilPct = totalWeekCapacity > 0 ? Math.round((totalWeekHours / totalWeekCapacity) * 100) : 0;
  const brands = brandBreakdown(blocks);

  // Week label
  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === 1 ? 'Next week'
    : weekOffset === -1 ? 'Last week'
    : weekDays.length ? `${fmtDate(weekDays[0])} – ${fmtDate(weekDays[6])}` : '';

  if (!mounted) return null;

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>
              Calendar · {weekLabel}
            </p>
            <h1 className="font-display text-5xl uppercase tracking-tight">{selectedPersonName}</h1>
            {/* Capacity bar */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Person switcher */}
            {canSwitch && teamMembers.length > 0 && (
              <select
                value={selectedPersonId}
                onChange={e => handlePersonChange(e.target.value)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 16px', outline: 'none', cursor: 'pointer', color: 'var(--ink)' }}
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.department ? ` — ${m.department}` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* View toggle */}
            {(['grid', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '8px 14px', borderRadius: '999px', cursor: 'pointer',
                  background: viewMode === mode ? 'var(--ink)' : 'transparent',
                  color: viewMode === mode ? 'var(--cream)' : 'var(--gray)',
                  border: `1px solid ${viewMode === mode ? 'var(--ink)' : 'var(--line)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'grid' ? 'Time grid' : 'List'}
              </button>
            ))}

            {/* Week navigation */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer', color: 'var(--ink)' }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                style={{
                  fontFamily: 'var(--f-mono)', fontSize: '11px', borderRadius: '999px', padding: '8px 14px', cursor: weekOffset === 0 ? 'default' : 'pointer',
                  background: weekOffset === 0 ? 'var(--ink)' : 'var(--paper)',
                  color: weekOffset === 0 ? 'var(--cream)' : 'var(--ink)',
                  border: `1px solid ${weekOffset === 0 ? 'var(--ink)' : 'var(--line)'}`,
                  opacity: weekOffset === 0 ? 0.5 : 1,
                }}
              >
                Today
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer', color: 'var(--ink)' }}
              >
                Next →
              </button>
            </div>

            {/* Google Calendar indicator */}
            {selectedPersonId === myPersonId && (
              googleConnected ? (
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />
                  GCal
                </span>
              ) : (
                <a
                  href="/api/auth/google"
                  style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px', textDecoration: 'none', display: 'inline-block' }}
                >
                  Connect Google Calendar
                </a>
              )
            )}
          </div>
        </div>

        {loadingBlocks && (
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>Loading…</p>
        )}

        {/* ── Weekly summary strip ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) auto', gap: '6px', alignItems: 'stretch' }}>
          {weekDays.map((d, i) => {
            const blockCount = blocks.filter(b => isSameDay(new Date(b.start_at), d)).length;
            const googleCount = (selectedPersonId === myPersonId ? googleEvents : []).filter(e => e.start && isSameDay(new Date(e.start), d)).length;
            const count = blockCount + googleCount;
            const isToday = isSameDay(d, new Date());
            const isActive = i === activeDayIndex;
            const overbooked = isOverbooked(d);
            const dayH = Math.round((dayHours[d.toDateString()] ?? 0) * 10) / 10;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px',
                  borderRadius: '12px', border: `1px solid ${overbooked ? 'var(--coral)' : isActive ? 'var(--ink)' : isToday ? 'var(--coral)' : 'var(--line)'}`,
                  background: isActive ? 'var(--ink)' : overbooked ? 'rgba(229,93,74,0.06)' : 'var(--paper)',
                  color: isActive ? 'var(--cream)' : 'var(--ink)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>{DAYS[i]}</span>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: '22px', lineHeight: 1.2, color: isActive ? 'var(--cream)' : isToday && !isActive ? 'var(--coral)' : 'inherit' }}>{d.getDate()}</span>
                {dayH > 0 && (
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', marginTop: '2px', color: isActive ? 'rgba(255,255,255,0.6)' : overbooked ? 'var(--coral)' : 'var(--gray)' }}>
                    {dayH}h{overbooked ? ' ⚠' : ''}
                  </span>
                )}
                {count === 0 && <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--line)', marginTop: '2px' }}>free</span>}
              </button>
            );
          })}
          {/* Weekly stats chip */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
            padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--paper)', minWidth: '110px',
          }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '4px' }}>Week total</p>
            <p style={{ fontFamily: 'var(--f-display)', fontSize: '20px', lineHeight: 1, color: weekUtilPct > 100 ? 'var(--coral)' : 'var(--ink)' }}>
              {Math.round(totalWeekHours * 10) / 10}h
            </p>
            <div style={{ width: '100%', height: '3px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}>
              <div style={{ width: `${Math.min(100, weekUtilPct)}%`, height: '100%', background: weekUtilPct > 100 ? 'var(--coral)' : 'var(--cobalt)', borderRadius: '999px' }} />
            </div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', marginTop: '3px' }}>{weekUtilPct}% of {totalWeekCapacity}h</p>
          </div>
        </div>

        {/* ── Time Grid View ──────────────────────────────────────────── */}
        {viewMode === 'grid' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: '680px' }}>
              {/* Time axis */}
              <div style={{ width: '44px', flexShrink: 0, position: 'relative', height: `${GRID_H}px`, marginTop: '32px' }}>
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', top: `${i * CELL_H}px`, right: '8px', transform: 'translateY(-50%)' }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                      {hourLabel(HOUR_START + i)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gap: '4px' }}>
                {weekDays.map((d, colIdx) => {
                  const dayBlocks = blocks.filter(b => isSameDay(new Date(b.start_at), d));
                  const dayGoogleEvents = (selectedPersonId === myPersonId ? googleEvents : []).filter(e => e.start && isSameDay(new Date(e.start), d));
                  const isToday = isSameDay(d, new Date());
                  const isActive = colIdx === activeDayIndex;
                  const overbooked = isOverbooked(d);

                  return (
                    <div key={colIdx}>
                      {/* Column header */}
                      <div
                        onClick={() => setSelectedDay(colIdx)}
                        style={{
                          height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: overbooked ? 'var(--coral)' : isActive ? 'var(--ink)' : isToday ? 'var(--coral)' : 'var(--gray)',
                          fontWeight: isToday || isActive ? 700 : 400, marginBottom: '3px', cursor: 'pointer',
                        }}
                      >
                        {DAYS[colIdx]} {d.getDate()}
                      </div>

                      {/* Column body */}
                      <div style={{
                        position: 'relative', height: `${GRID_H}px`,
                        background: isActive ? 'rgba(13,13,11,0.02)' : isToday ? 'rgba(229,93,74,0.02)' : 'var(--paper)',
                        border: `1px solid ${overbooked ? 'rgba(229,93,74,0.35)' : isActive ? 'rgba(13,13,11,0.15)' : 'var(--line)'}`,
                        borderRadius: '10px', overflow: 'hidden',
                      }}>
                        {/* Hour gridlines */}
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                          <div key={i} style={{
                            position: 'absolute', top: `${i * CELL_H}px`, left: 0, right: 0,
                            borderTop: `1px solid ${i === 0 ? 'transparent' : 'var(--line)'}`, opacity: 0.6,
                          }} />
                        ))}

                        {/* Current time line */}
                        {isToday && (() => {
                          const now = new Date();
                          const h = now.getHours() + now.getMinutes() / 60;
                          if (h < HOUR_START || h > HOUR_END) return null;
                          const top = (h - HOUR_START) * CELL_H;
                          return (
                            <div style={{ position: 'absolute', top: `${top}px`, left: 0, right: 0, zIndex: 10, pointerEvents: 'none' }}>
                              <div style={{ position: 'relative', borderTop: '2px solid var(--coral)' }}>
                                <div style={{ position: 'absolute', left: '-1px', top: '-4px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--coral)' }} />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Task blocks */}
                        {dayBlocks.map((block, bIdx) => {
                          const top = blockTopPx(block.start_at);
                          const height = blockHeightPx(block.start_at, block.end_at);
                          const color = brandColor(block.tasks.brands.name);
                          const tooShort = height < 36;
                          // Simple overlap: offset if same day has multiple blocks
                          const sameStartBlocks = dayBlocks.filter((_, j) => j < bIdx && Math.abs(blockTopPx(dayBlocks[j].start_at) - top) < 10);
                          const leftOffset = sameStartBlocks.length * 4;
                          return (
                            <button
                              key={block.id}
                              onClick={() => setSelectedBlock(block)}
                              title={`${block.tasks.deliverable} · ${formatTime(block.start_at)}–${formatTime(block.end_at)}`}
                              style={{
                                position: 'absolute', top: `${top + 1}px`,
                                left: `${3 + leftOffset}px`, right: `${3}px`,
                                height: `${height - 2}px`,
                                background: color, color: '#fff',
                                borderRadius: '6px', padding: tooShort ? '2px 6px' : '5px 7px',
                                textAlign: 'left', border: 'none', cursor: 'pointer', zIndex: 5 + bIdx,
                                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            >
                              {!tooShort && (
                                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', opacity: 0.8, textTransform: 'uppercase', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: '1px' }}>
                                  {block.tasks.brands.name}
                                </p>
                              )}
                              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                                {block.tasks.deliverable}
                              </p>
                              {!tooShort && (
                                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', opacity: 0.75, marginTop: '2px' }}>
                                  {formatTime(block.start_at)} – {formatTime(block.end_at)}
                                </p>
                              )}
                            </button>
                          );
                        })}

                        {/* Google Calendar events in grid */}
                        {dayGoogleEvents.map((event) => {
                          if (event.isAllDay || !event.start) return null;
                          const top = blockTopPx(event.start);
                          const height = event.end ? blockHeightPx(event.start, event.end) : CELL_H;
                          return (
                            <div
                              key={event.id}
                              title={event.title}
                              style={{
                                position: 'absolute', top: `${top + 1}px`, left: '3px', right: '3px',
                                height: `${height - 2}px`, background: 'rgba(66,133,244,0.15)',
                                borderLeft: '3px solid #4285F4', borderRadius: '4px',
                                padding: '3px 6px', overflow: 'hidden', zIndex: 4,
                              }}
                            >
                              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: '#4285F4', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {event.title}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── List View (original day card view) ─────────────────────── */}
        {viewMode === 'list' && (
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '12px' }}>
              {activeDay?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {todayBlocks.length === 0 && todayGoogleEvents.length === 0 ? (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray)' }}>No blocks assigned for this day.</p>
                {isLead && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)', marginTop: '4px' }}>Use Chat to add work.</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {todayBlocks.map(block => (
                  <button
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className="w-full bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 shadow-[4px_4px_0_var(--ink)] hover:shadow-[6px_6px_0_var(--ink)] transition text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-mono uppercase tracking-[0.1em] text-[var(--gray)]">{block.tasks.brands.name}</p>
                        <p className="font-display text-2xl uppercase tracking-tight mt-0.5">{block.tasks.deliverable}</p>
                      </div>
                      <span className="text-xs font-mono uppercase px-2 py-1 rounded" style={PRIORITY_STYLE[block.tasks.priority] ?? { background: 'var(--cream-2)' }}>
                        {block.tasks.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-[var(--gray)]">
                      <span>{formatTime(block.start_at)} – {formatTime(block.end_at)}</span>
                      <span>{block.tasks.estimated_hours}h</span>
                      <span className="capitalize">{STATUS_LABEL[block.status] ?? block.status}</span>
                    </div>
                    <p className="text-xs font-mono text-[var(--cobalt)] mt-2 uppercase tracking-wider">Tap to open context →</p>
                  </button>
                ))}

                {todayGoogleEvents.map(event => (
                  <div
                    key={event.id}
                    className="w-full bg-[var(--paper)] border rounded-2xl p-5 text-left"
                    style={{ borderColor: '#4285F4', borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-mono uppercase tracking-[0.1em]" style={{ color: '#4285F4' }}>Google Calendar</p>
                        <p className="font-display text-2xl uppercase tracking-tight mt-0.5">{event.title}</p>
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
        )}

        {/* ── Brand breakdown (weekly) ────────────────────────────────── */}
        {brands.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '10px' }}>
              Brand breakdown · this week
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {brands.map(b => (
                <div
                  key={b.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px',
                    padding: '6px 14px 6px 10px',
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: brandColor(b.name), flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 600 }}>{b.name}</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>{Math.round(b.hours * 10) / 10}h</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)' }}>{b.count} task{b.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Available capacity note ─────────────────────────────────── */}
        {weekDays.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {weekDays.slice(0, 5).map((d, i) => {
              const h = Math.round((dayHours[d.toDateString()] ?? 0) * 10) / 10;
              const avail = Math.max(0, Math.round((selectedPersonHours - h) * 10) / 10);
              const pct = Math.min(100, (h / selectedPersonHours) * 100);
              const over = h > selectedPersonHours;
              return (
                <div key={i} style={{ flex: 1, minWidth: '80px', background: 'var(--paper)', border: `1px solid ${over ? 'rgba(229,93,74,0.4)' : 'var(--line)'}`, borderRadius: '10px', padding: '10px 12px' }}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '4px' }}>{DAYS[i]}</p>
                  <div style={{ height: '3px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: over ? 'var(--coral)' : 'var(--cobalt)', borderRadius: '999px' }} />
                  </div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: over ? 'var(--coral)' : 'var(--ink)' }}>
                    {over ? `+${Math.round((h - selectedPersonHours) * 10) / 10}h over` : `${avail}h free`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
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
