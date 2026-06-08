# Resource Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing `/calendar` page into a resource planning dashboard where leads/admins can switch between team members, see a time-grid week view, and spot overbooked days at a glance.

**Architecture:** Extend the existing `calendar/page.tsx` (server) to fetch team member list for leads/admins, then pass it to an upgraded `calendar-client.tsx` that adds a person switcher, fetches selected person's blocks client-side, and renders a time-positioned grid instead of a flat card list.

**Tech Stack:** Next.js 16 App Router, Supabase client (browser), React useState/useEffect, inline CSS positioning for time grid.

---

## File Map

| File | Change |
|------|--------|
| `app/(app)/calendar/page.tsx` | Fetch current user tier + visible team members, pass to client |
| `app/(app)/calendar/calendar-client.tsx` | Add person switcher, time grid view, overbooked detection, week nav |

No new files. No new API routes. No new DB tables.

---

### Task 1: Fetch tier + team members in the server page

**Files:**
- Modify: `app/(app)/calendar/page.tsx`

- [ ] **Step 1: Update the people query to fetch tier and team scope**

Replace the existing person select and add team member fetch for leads/admins. Full updated `page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import CalendarClient from './calendar-client';

export type BlockWithTask = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  actual_hours: number | null;
  tasks: {
    id: string;
    deliverable: string;
    task_type: string;
    priority: string;
    estimated_hours: number;
    notes: string | null;
    status: string;
    owner_id: string;
    reviewer_id: string | null;
    brands: {
      id: string;
      slug: string;
      name: string;
      colors: Record<string, string>;
      typography: Record<string, string>;
      voice_summary: string | null;
    };
    owner: { id: string; name: string };
    reviewer: { id: string; name: string } | null;
    references: { id: string; ref_type: string; url: string | null; caption: string | null }[];
  };
};

export type TeamMember = { id: string; name: string; department: string; default_hours_per_day: number | null };

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: person } = await supabase
    .from('people')
    .select('id, name, is_team_lead, google_calendar_connected, access_tier, manager_id, default_hours_per_day')
    .eq('email', user!.email!)
    .maybeSingle();

  if (!person) return <p className="text-[var(--gray)]">Person record not found. Contact admin.</p>;

  const tier = (person as any).access_tier ?? 'staff';
  const isAdmin = tier === 'admin';
  const isLead = tier === 'lead' || person.is_team_lead;

  // Fetch visible team members for person switcher
  let teamMembers: TeamMember[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('people')
      .select('id, name, department, default_hours_per_day')
      .order('name');
    teamMembers = (data ?? []) as TeamMember[];
  } else if (isLead) {
    const { data: directs } = await supabase
      .from('people')
      .select('id, name, department, default_hours_per_day, manager_id')
      .eq('manager_id', person.id);
    const directIds = (directs ?? []).map((p: any) => p.id);
    let grandReports: any[] = [];
    if (directIds.length > 0) {
      const { data: grands } = await supabase
        .from('people')
        .select('id, name, department, default_hours_per_day')
        .in('manager_id', directIds);
      grandReports = grands ?? [];
    }
    // Include self
    teamMembers = [
      { id: person.id, name: (person as any).name, department: '', default_hours_per_day: (person as any).default_hours_per_day },
      ...(directs ?? []),
      ...grandReports,
    ] as TeamMember[];
  }

  // Fetch this person's blocks for current week
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const weekEnd = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: blocks } = await supabase
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
    .eq('person_id', person.id)
    .gte('start_at', monday.toISOString())
    .lt('start_at', weekEnd.toISOString())
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true });

  return (
    <CalendarClient
      personId={person.id}
      personName={(person as any).name}
      isLead={isLead}
      isAdmin={isAdmin}
      googleConnected={!!(person as any).google_calendar_connected}
      blocks={(blocks ?? []) as unknown as BlockWithTask[]}
      teamMembers={teamMembers}
      defaultHoursPerDay={(person as any).default_hours_per_day ?? 9}
    />
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "C:\Users\HR 1\OneDrive\ドキュメント\Chord-CRM\chord-os" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on this file (CalendarClient props may show errors until Task 2 is done — that's fine).

---

### Task 2: Upgrade CalendarClient — person switcher + week nav + time grid

**Files:**
- Modify: `app/(app)/calendar/calendar-client.tsx`

This is the main task. Full replacement of the client component. Key additions:
1. Person switcher dropdown (leads/admins only) — fetches blocks for selected person via Supabase
2. Prev/Next week navigation
3. Time grid: 9am–9pm, blocks positioned by `top` + `height` CSS math
4. Overbooked day detection — day column header turns red

- [ ] **Step 1: Replace calendar-client.tsx with the upgraded version**

```tsx
'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import type { BlockWithTask, TeamMember } from './page';
import ContextModal from '@/components/context-modal';
import { createClient } from '@/lib/supabase/client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_START = 8;   // 8am
const HOUR_END = 21;    // 9pm
const TOTAL_HOURS = HOUR_END - HOUR_START;
const CELL_HEIGHT = 64; // px per hour
const GRID_HEIGHT = TOTAL_HOURS * CELL_HEIGHT;

function getWeekStart(offset = 0): Date {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC'
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function blockTop(iso: string): number {
  const d = new Date(iso);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return Math.max(0, (h - HOUR_START) * CELL_HEIGHT);
}

function blockHeight(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const durationHours = (end.getTime() - start.getTime()) / 3600000;
  return Math.max(24, durationHours * CELL_HEIGHT);
}

// Generate a stable color per brand name
function brandColor(brandName: string): string {
  const colors = [
    '#E55D4A', '#2226D9', '#2a9d5c', '#e9c46a',
    '#264653', '#e76f51', '#457b9d', '#6d6875',
  ];
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const PRIORITY_STYLE: Record<string, CSSProperties> = {
  P0: { background: 'var(--red)', color: '#fff' },
  P1: { background: 'var(--ink)', color: 'var(--cream)' },
  P2: { background: 'var(--line)', color: 'var(--ink)' },
};

export default function CalendarClient({
  personId: initialPersonId,
  personName: initialPersonName,
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [mounted, setMounted] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockWithTask | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Person switcher
  const [selectedPersonId, setSelectedPersonId] = useState(initialPersonId);
  const [selectedPersonName, setSelectedPersonName] = useState(initialPersonName);
  const [blocks, setBlocks] = useState<BlockWithTask[]>(initialBlocks);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // Capacity per day: personId → date string → blocked hours
  const [capacityMap, setCapacityMap] = useState<Record<string, number>>({});

  const canSwitch = isAdmin || isLead;

  useEffect(() => {
    const ws = getWeekStart(weekOffset);
    setWeekDays(getWeekDays(ws));
    setMounted(true);
  }, [weekOffset]);

  // Fetch blocks when person or week changes
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

  // Fetch when week changes (skip initial — we already have server blocks)
  useEffect(() => {
    if (!mounted) return;
    fetchBlocks(selectedPersonId, weekOffset);
  }, [weekOffset, selectedPersonId, mounted]);

  // Build capacity map: date string → total blocked hours
  useEffect(() => {
    const map: Record<string, number> = {};
    blocks.forEach(b => {
      const d = new Date(b.start_at);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      const durationH = (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 3600000;
      map[key] = (map[key] ?? 0) + durationH;
    });
    setCapacityMap(map);
  }, [blocks]);

  function dayKey(d: Date) {
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  }

  function isOverbooked(d: Date): boolean {
    return (capacityMap[dayKey(d)] ?? 0) > (defaultHoursPerDay ?? 9);
  }

  function handlePersonChange(pid: string) {
    const member = teamMembers.find(m => m.id === pid);
    setSelectedPersonId(pid);
    setSelectedPersonName(member?.name ?? '');
  }

  if (!mounted) return null;

  const today = new Date();
  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === 1 ? 'Next week'
    : weekOffset === -1 ? 'Last week'
    : `${fmtDate(weekDays[0])} – ${fmtDate(weekDays[6])}`;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: '6px' }}>
              Calendar · {weekLabel}
            </p>
            <h1 className="font-display text-5xl uppercase tracking-tight">{selectedPersonName}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Person switcher */}
            {canSwitch && teamMembers.length > 0 && (
              <select
                value={selectedPersonId}
                onChange={e => handlePersonChange(e.target.value)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px', outline: 'none', cursor: 'pointer' }}
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.department ? ` — ${m.department}` : ''}</option>
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
                }}
              >
                {mode === 'grid' ? 'Time grid' : 'List'}
              </button>
            ))}
            {/* Week nav */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer' }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: weekOffset === 0 ? 'var(--ink)' : 'var(--paper)', color: weekOffset === 0 ? 'var(--cream)' : 'var(--ink)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 14px', cursor: weekOffset === 0 ? 'default' : 'pointer', opacity: weekOffset === 0 ? 0.5 : 1 }}
              >
                Today
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer' }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {loadingBlocks && (
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>Loading…</p>
        )}

        {/* Week header strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {weekDays.map((d, i) => {
            const count = blocks.filter(b => isSameDay(new Date(b.start_at), d)).length;
            const isToday = isSameDay(d, today);
            const overbooked = isOverbooked(d);
            const blocked = capacityMap[dayKey(d)] ?? 0;
            return (
              <div
                key={i}
                style={{
                  background: overbooked ? 'rgba(229,93,74,0.08)' : 'var(--paper)',
                  border: `1px solid ${overbooked ? 'var(--coral)' : isToday ? 'var(--ink)' : 'var(--line)'}`,
                  borderRadius: '10px',
                  padding: '10px 8px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)' }}>{DAYS[i]}</p>
                <p style={{ fontFamily: 'var(--f-display)', fontSize: '22px', lineHeight: 1.2, color: isToday ? 'var(--coral)' : 'var(--ink)' }}>{d.getDate()}</p>
                {blocked > 0 && (
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: overbooked ? 'var(--coral)' : 'var(--gray)', marginTop: '2px' }}>
                    {Math.round(blocked * 10) / 10}h{overbooked ? ' ⚠' : ''}
                  </p>
                )}
                {count === 0 && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--line)', marginTop: '2px' }}>free</p>}
              </div>
            );
          })}
        </div>

        {/* Time grid view */}
        {viewMode === 'grid' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: '700px' }}>
              {/* Time axis */}
              <div style={{ width: '48px', flexShrink: 0, position: 'relative', height: `${GRID_HEIGHT}px`, marginTop: '28px' }}>
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', top: `${i * CELL_HEIGHT}px`, right: '8px', transform: 'translateY(-50%)' }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)' }}>
                      {((HOUR_START + i) % 12 || 12)}{HOUR_START + i < 12 ? 'am' : 'pm'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gap: '4px' }}>
                {weekDays.map((d, colIdx) => {
                  const dayBlocks = blocks.filter(b => isSameDay(new Date(b.start_at), d));
                  const isToday = isSameDay(d, today);
                  const overbooked = isOverbooked(d);
                  return (
                    <div key={colIdx}>
                      {/* Column header */}
                      <div style={{
                        height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase',
                        color: overbooked ? 'var(--coral)' : isToday ? 'var(--ink)' : 'var(--gray)',
                        fontWeight: isToday ? 700 : 400,
                        marginBottom: '2px',
                      }}>
                        {DAYS[colIdx]} {d.getDate()}
                      </div>
                      {/* Column body */}
                      <div style={{
                        position: 'relative',
                        height: `${GRID_HEIGHT}px`,
                        background: isToday ? 'rgba(229,93,74,0.03)' : 'var(--paper)',
                        border: `1px solid ${overbooked ? 'rgba(229,93,74,0.3)' : 'var(--line)'}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}>
                        {/* Hour lines */}
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                          <div key={i} style={{ position: 'absolute', top: `${i * CELL_HEIGHT}px`, left: 0, right: 0, borderTop: '1px solid var(--line)', opacity: 0.5 }} />
                        ))}
                        {/* Current time indicator */}
                        {isToday && (() => {
                          const now = new Date();
                          const h = now.getHours() + now.getMinutes() / 60;
                          if (h < HOUR_START || h > HOUR_END) return null;
                          return (
                            <div style={{ position: 'absolute', top: `${(h - HOUR_START) * CELL_HEIGHT}px`, left: 0, right: 0, borderTop: '2px solid var(--coral)', zIndex: 10 }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--coral)', marginTop: '-4px', marginLeft: '-3px' }} />
                            </div>
                          );
                        })()}
                        {/* Task blocks */}
                        {dayBlocks.map(block => {
                          const top = blockTop(block.start_at);
                          const height = blockHeight(block.start_at, block.end_at);
                          const color = brandColor(block.tasks.brands.name);
                          const isTooShort = height < 40;
                          return (
                            <button
                              key={block.id}
                              onClick={() => setSelectedBlock(block)}
                              title={`${block.tasks.deliverable} · ${fmtTime(block.start_at)}–${fmtTime(block.end_at)}`}
                              style={{
                                position: 'absolute',
                                top: `${top}px`,
                                left: '3px',
                                right: '3px',
                                height: `${height}px`,
                                background: color,
                                color: '#fff',
                                borderRadius: '6px',
                                padding: isTooShort ? '2px 6px' : '4px 6px',
                                textAlign: 'left',
                                border: 'none',
                                cursor: 'pointer',
                                zIndex: 5,
                                overflow: 'hidden',
                              }}
                            >
                              {!isTooShort && (
                                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', opacity: 0.8, textTransform: 'uppercase', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                  {block.tasks.brands.name}
                                </p>
                              )}
                              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                {block.tasks.deliverable}
                              </p>
                              {!isTooShort && (
                                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', opacity: 0.7 }}>
                                  {fmtTime(block.start_at)}
                                </p>
                              )}
                            </button>
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

        {/* List view (existing behaviour) */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            {weekDays.map((d, i) => {
              const dayBlocks = blocks.filter(b => isSameDay(new Date(b.start_at), d));
              if (dayBlocks.length === 0) return null;
              return (
                <div key={i}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '8px' }}>
                    {DAYS[i]} · {fmtDate(d)}
                  </p>
                  <div className="space-y-2">
                    {dayBlocks.map(block => (
                      <button
                        key={block.id}
                        onClick={() => setSelectedBlock(block)}
                        className="w-full text-left"
                        style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '2px' }}>{block.tasks.brands.name}</p>
                          <p style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.tasks.deliverable}</p>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>
                            {fmtTime(block.start_at)} – {fmtTime(block.end_at)} · {block.tasks.estimated_hours}h
                          </p>
                        </div>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', flexShrink: 0, ...PRIORITY_STYLE[block.tasks.priority] ?? {}, borderRadius: '4px', padding: '3px 8px' }}>
                          {block.tasks.priority}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {blocks.length === 0 && (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--gray)', fontFamily: 'var(--f-mono)', fontSize: '12px' }}>No blocks this week.</p>
              </div>
            )}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:\Users\HR 1\OneDrive\ドキュメント\Chord-CRM\chord-os" && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If `ContextModal` prop types complain, check `components/context-modal.tsx` and adjust.

- [ ] **Step 3: Deploy and test**

Push to Vercel. Test:
1. Open `/calendar` as admin — person dropdown shows all people
2. Switch person — blocks update for that person
3. Click Prev/Next week — blocks reload for that week
4. Overbooked day (>9h blocked) shows red header + ⚠
5. Toggle to List view — existing card behaviour preserved
6. Click any block — ContextModal opens
7. Open as staff — no person dropdown, only own calendar

---

## Self-Review

**Spec coverage:**
- ✅ Person switcher: admin = all, lead = team, staff = self
- ✅ Week view with time grid (8am–9pm)
- ✅ List view preserved
- ✅ Overbooked detection (sum hours > default_hours_per_day)
- ✅ Brand-wise color coding on blocks
- ✅ Click block → ContextModal (brand breakdown)
- ✅ Prev/Next week navigation
- ✅ Current time indicator
- ✅ No new DB tables, no new API routes

**What's NOT in scope (intentional):**
- Multi-person day view (separate feature)
- Google Calendar events in grid view (complex, separate task)
- Overlapping block side-by-side rendering (edge case, deferred)
