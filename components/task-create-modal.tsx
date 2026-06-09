'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Brand = { id: string; name: string; slug: string };
type Person = { id: string; name: string; department: string };
type EditTask = {
  id: string;
  brand_id: string;
  owner_id: string;
  reviewer_id: string | null;
  deliverable: string;
  task_name: string | null;
  task_type: string;
  priority: string;
  estimated_hours: number | null;
  start_date: string | null;
  deadline: string | null;
  notes: string | null;
  owner?: { name: string } | null;
};

const TASK_TYPES = ['design', 'copy', 'video', 'seo', 'content', 'strategy', 'other'] as const;

const SPECIFIC_TASK_TYPES = [
  'Static', 'Carousel', 'Motion graphic frames', 'AI frames', 'AI video',
  'Shoot prep', 'Shoot', 'Edit Video', 'Story', 'Calendar', 'Report',
  'Brand tracker update', 'ORM tracker', 'Meeting', 'A+ content writing',
  'A+ banner', 'A+ tile', 'A+ master', 'Brainstorming', 'Performance ad',
  'Performance ad video', 'Website content', 'Website wireframe', 'Website page',
  'Influencer scripting', 'Strategy plan', 'DVC scripts', 'Mainline ad assets',
  'Adapts + minor changes', 'Shoot lineups', 'Other',
] as const;
const PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'] as const;

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'P0 — Critical',
  P1: 'P1 — High',
  P2: 'P2 — Medium',
  P3: 'P3 — Low',
  P4: 'P4 — Backlog',
};

const TASK_HOURS: Record<string, { min: number; max: number }> = {
  'static':                  { min: 0.5, max: 2 },
  'carousel':                { min: 1,   max: 3 },
  'motion graphic frames':   { min: 0.5, max: 2 },
  'ai frames':               { min: 0.5, max: 1.5 },
  'ai video':                { min: 1,   max: 2.5 },
  'shoot prep':              { min: 2,   max: 3 },
  'shoot':                   { min: 2,   max: 8 },
  'edit video':              { min: 2,   max: 4 },
  'story':                   { min: 0.5, max: 0.5 },
  'calendar':                { min: 2,   max: 4 },
  'report':                  { min: 2,   max: 3 },
  'brand tracker update':    { min: 0.5, max: 1 },
  'orm tracker':             { min: 0.5, max: 1 },
  'meeting':                 { min: 0.5, max: 1 },
  'a+ content writing':      { min: 1,   max: 1.5 },
  'a+ banner':               { min: 1,   max: 1.5 },
  'a+ tile':                 { min: 1,   max: 1.5 },
  'a+ master':               { min: 1,   max: 3 },
  'brainstorming':           { min: 0.5, max: 3 },
  'performance ad':          { min: 0.5, max: 1.5 },
  'performance ad video':    { min: 1,   max: 2 },
  'website content':         { min: 1.5, max: 2.5 },
  'website wireframe':       { min: 0.5, max: 2 },
  'website page':            { min: 0.5, max: 2.5 },
  'influencer scripting':    { min: 0.5, max: 1.5 },
  'strategy plan':           { min: 1,   max: 2.5 },
  'dvc scripts':             { min: 2.5, max: 3.5 },
  'mainline ad assets':      { min: 2,   max: 4 },
  'adapts + minor changes':  { min: 0.5, max: 1 },
  'shoot lineups':           { min: 0.5, max: 1 },
  // fallback for generic types
  'design':                  { min: 0.5, max: 8 },
  'copy':                    { min: 0.5, max: 4 },
  'video':                   { min: 1,   max: 8 },
  'seo':                     { min: 0.5, max: 4 },
  'content':                 { min: 0.5, max: 4 },
  'strategy':                { min: 1,   max: 4 },
  'other':                   { min: 0.5, max: 8 },
};

// Convert ISO string back to datetime-local format (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

const RECURRENCE_PATTERNS = [
  { value: 'weekdays', label: 'Mon – Fri' },
  { value: 'daily',    label: 'Every day' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'custom',   label: 'Custom' },
] as const;
type RecurrencePattern = typeof RECURRENCE_PATTERNS[number]['value'];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TaskCreateModal({
  brands,
  people,
  onClose,
  isStaff = false,
  currentPersonId = '',
  editTask,
}: {
  brands: Brand[];
  people: Person[];
  onClose: () => void;
  isStaff?: boolean;
  currentPersonId?: string;
  editTask?: EditTask;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [p0Warning, setP0Warning] = useState<{
    conflict_type: 'employee' | 'brand';
    conflicting_task: { id: string; deliverable: string; brand: string | null; owner: string | null; start: string | null; end: string | null };
    pendingBody: Record<string, any>;
  } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isEdit = !!editTask;

  // Recurrence state (create-only)
  const [recurring, setRecurring] = useState(false);
  const [recPattern, setRecPattern] = useState<RecurrencePattern>('weekdays');
  const [customDays, setCustomDays] = useState<boolean[]>([true, true, true, true, true, false, false]); // Mon–Fri
  const [endType, setEndType] = useState<'occurrences' | 'end_date'>('occurrences');
  const [occurrences, setOccurrences] = useState('5');
  const [recEndDate, setRecEndDate] = useState('');

  const [quantity, setQuantity] = useState(1);

  const [form, setForm] = useState({
    brand_id: editTask?.brand_id ?? brands[0]?.id ?? '',
    owner_id: editTask?.owner_id ?? (isStaff ? currentPersonId : (people[0]?.id ?? '')),
    reviewer_id: editTask?.reviewer_id ?? '',
    deliverable: editTask?.deliverable ?? '',
    task_name: editTask?.task_name ?? 'Static',
    task_type: (editTask?.task_type ?? 'design') as typeof TASK_TYPES[number],
    priority: (editTask?.priority ?? 'P1') as typeof PRIORITIES[number],
    estimated_hours: editTask?.estimated_hours?.toString() ?? '',
    start_date: toDatetimeLocal(editTask?.start_date ?? null),
    deadline: toDatetimeLocal(editTask?.deadline ?? null),
    notes: editTask?.notes ?? '',
  });

  // Add minutes to a datetime-local string
  function addHours(dt: string, hours: number): string {
    const ms = new Date(dt).getTime() + hours * 3600000;
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function diffHours(start: string, end: string): string {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff <= 0) return '';
    return String(Math.round((diff / 3600000) * 10) / 10);
  }

  function onHoursChange(val: string) {
    const h = parseFloat(val);
    if (form.start_date && !isNaN(h) && h > 0) {
      setForm(f => ({ ...f, estimated_hours: val, deadline: addHours(f.start_date, h) }));
    } else {
      setForm(f => ({ ...f, estimated_hours: val }));
    }
  }

  function onStartChange(val: string) {
    const h = parseFloat(form.estimated_hours);
    if (!isNaN(h) && h > 0) {
      // hours set → derive end
      setForm(f => ({ ...f, start_date: val, deadline: addHours(val, h) }));
    } else if (form.deadline) {
      // end set → derive hours
      setForm(f => ({ ...f, start_date: val, estimated_hours: diffHours(val, f.deadline) }));
    } else {
      setForm(f => ({ ...f, start_date: val }));
    }
  }

  function onEndChange(val: string) {
    if (form.start_date) {
      setForm(f => ({ ...f, deadline: val, estimated_hours: diffHours(f.start_date, val) }));
    } else {
      setForm(f => ({ ...f, deadline: val }));
    }
  }

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.deliverable.trim()) { setError('Deliverable is required.'); return; }
    if (!form.start_date || !form.deadline) { setError('Start and end date/time are required.'); return; }
    if (new Date(form.deadline) <= new Date(form.start_date)) { setError('End time must be after start time.'); return; }

    const hours = parseFloat(form.estimated_hours);
    if (!isNaN(hours) && hours > 0) {
      const limits = TASK_HOURS[form.task_name.toLowerCase()];
      if (limits) {
        const scaledMin = Math.round(limits.min * quantity * 10) / 10;
        const scaledMax = Math.round(limits.max * quantity * 10) / 10;
        if (hours < scaledMin) {
          setError(`Duration too short for ${quantity > 1 ? `${quantity}× ` : ''}"${form.task_name}". Minimum is ${scaledMin}h.`);
          return;
        }
        if (hours > scaledMax) {
          setError(`Duration too long for ${quantity > 1 ? `${quantity}× ` : ''}"${form.task_name}". Maximum is ${scaledMax}h.`);
          return;
        }
      }
    }

    // Recurrence validation
    if (!isEdit && recurring) {
      if (endType === 'occurrences') {
        const n = parseInt(occurrences);
        if (isNaN(n) || n < 1 || n > 60) { setError('Occurrences must be between 1 and 60.'); return; }
      } else {
        if (!recEndDate) { setError('Select an end date for the recurring task.'); return; }
        if (new Date(recEndDate) < new Date(form.start_date.slice(0, 10))) {
          setError('End date must be on or after the start date.'); return;
        }
      }
      if (recPattern === 'custom' && !customDays.some(Boolean)) {
        setError('Select at least one day for the custom schedule.'); return;
      }
    }

    const recurrencePayload = (!isEdit && recurring) ? {
      recurrence: {
        pattern: recPattern,
        customDays: recPattern === 'custom' ? customDays.map((on, i) => on ? i : -1).filter(i => i >= 0) : undefined,
        endType,
        occurrences: endType === 'occurrences' ? parseInt(occurrences) : undefined,
        endDate: endType === 'end_date' ? recEndDate : undefined,
      }
    } : {};

    const body = {
      ...form,
      reviewer_id: form.reviewer_id || undefined,
      notes: form.notes || undefined,
      ownerName: people.find(p => p.id === form.owner_id)?.name,
      ...recurrencePayload,
    };

    setLoading(true);
    setError('');
    try {
      const url = isEdit ? `/api/tasks/${editTask!.id}` : '/api/tasks';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      // P0 conflict warning — show inline, don't close modal
      if (res.status === 409 && data.warning) {
        setP0Warning({ conflict_type: data.conflict_type, conflicting_task: data.conflicting_task, pendingBody: body });
        return;
      }

      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function saveWithForce() {
    if (!p0Warning) return;
    setLoading(true);
    setError('');
    try {
      const url = isEdit ? `/api/tasks/${editTask!.id}` : '/api/tasks';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p0Warning.pendingBody, force: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setP0Warning(null); return; }
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const input = 'w-full bg-[var(--cream)] border border-[var(--line)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] font-mono';
  const label = 'block text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-1';

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/60 backdrop-blur-sm px-4"
    >
      <div
        className="w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-[10px_10px_0_var(--ink)]"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-[var(--line)]">
          <h2
            className="uppercase tracking-tight"
            style={{ fontFamily: 'var(--f-display)', fontSize: '28px' }}
          >
            {isEdit ? 'Edit Task' : 'Assign Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--gray)] hover:text-[var(--ink)] font-mono text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="px-8 py-6 space-y-5">
          {/* Brand + Owner row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Brand</label>
              <select
                value={form.brand_id}
                onChange={e => setForm(f => ({ ...f, brand_id: e.target.value }))}
                className={input}
              >
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Assign to</label>
              {isStaff ? (
                <div className={input} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  {people.find(p => p.id === currentPersonId)?.name ?? 'You'}
                </div>
              ) : (
                <select
                  value={form.owner_id}
                  onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                  className={input}
                >
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.department}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Reviewer */}
          <div>
            <label className={label}>Reviewer (optional)</label>
            <select
              value={form.reviewer_id}
              onChange={e => setForm(f => ({ ...f, reviewer_id: e.target.value }))}
              className={input}
            >
              <option value="">— No reviewer —</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.department}</option>
              ))}
            </select>
          </div>

          {/* Deliverable */}
          <div>
            <label className={label}>Deliverable</label>
            <input
              type="text"
              placeholder="e.g. 3 static posts — Eid campaign"
              value={form.deliverable}
              onChange={e => setForm(f => ({ ...f, deliverable: e.target.value }))}
              className={input}
            />
          </div>

          {/* Task name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Task type</label>
              <select
                value={form.task_name}
                onChange={e => setForm(f => ({ ...f, task_name: e.target.value }))}
                className={input}
              >
                {SPECIFIC_TASK_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <select
                value={form.task_type}
                onChange={e => setForm(f => ({ ...f, task_type: e.target.value as typeof TASK_TYPES[number] }))}
                className={input}
              >
                {TASK_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority + Quantity + Hours */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as typeof PRIORITIES[number] }))}
                className={input}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Quantity (assets)</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={input}
              />
            </div>
            <div>
              <label className={label}>
                Hours{(() => {
                  const l = TASK_HOURS[form.task_name.toLowerCase()];
                  if (!l) return '';
                  const mn = Math.round(l.min * quantity * 10) / 10;
                  const mx = Math.round(l.max * quantity * 10) / 10;
                  return ` (${mn}h–${mx}h)`;
                })()}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="e.g. 2"
                value={form.estimated_hours}
                onChange={e => onHoursChange(e.target.value)}
                className={input}
              />
            </div>
          </div>

          {/* Start + End date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Start date & time *</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={e => onStartChange(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>End date & time *</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => onEndChange(e.target.value)}
                className={input}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={label}>Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Formats, references, constraints..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className={`${input} resize-none`}
            />
          </div>

          {/* Recurring — create only */}
          {!isEdit && (
            <div>
              {/* Toggle row */}
              <button
                type="button"
                onClick={() => setRecurring(r => !r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                {/* Toggle pill */}
                <div style={{
                  width: '36px', height: '20px', borderRadius: '999px', position: 'relative', flexShrink: 0,
                  background: recurring ? 'var(--ink)' : 'var(--line)', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: '3px', width: '14px', height: '14px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    left: recurring ? '19px' : '3px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: recurring ? 'var(--ink)' : 'var(--gray)' }}>
                  Recurring task
                </span>
              </button>

              {/* Recurrence panel */}
              {recurring && (
                <div style={{ marginTop: '14px', padding: '16px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '14px' }} className="space-y-4">

                  {/* Pattern pills */}
                  <div>
                    <p className={label}>Repeat</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {RECURRENCE_PATTERNS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setRecPattern(p.value)}
                          style={{
                            fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
                            padding: '6px 14px', borderRadius: '999px', cursor: 'pointer', transition: 'all 0.15s',
                            background: recPattern === p.value ? 'var(--ink)' : 'transparent',
                            color: recPattern === p.value ? 'var(--cream)' : 'var(--gray)',
                            border: `1px solid ${recPattern === p.value ? 'var(--ink)' : 'var(--line)'}`,
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom day picker */}
                  {recPattern === 'custom' && (
                    <div>
                      <p className={label}>On these days</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {DAY_LABELS.map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCustomDays(d => d.map((v, j) => j === i ? !v : v))}
                            style={{
                              width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer',
                              fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, transition: 'all 0.15s',
                              background: customDays[i] ? 'var(--ink)' : 'transparent',
                              color: customDays[i] ? 'var(--cream)' : 'var(--gray)',
                              border: `1px solid ${customDays[i] ? 'var(--ink)' : 'var(--line)'}`,
                            }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End condition */}
                  <div>
                    <p className={label}>Ends</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Occurrences */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          checked={endType === 'occurrences'}
                          onChange={() => setEndType('occurrences')}
                          style={{ accentColor: 'var(--ink)' }}
                        />
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>After</span>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={occurrences}
                          onChange={e => setOccurrences(e.target.value)}
                          disabled={endType !== 'occurrences'}
                          style={{
                            width: '60px', fontFamily: 'var(--f-mono)', fontSize: '11px', textAlign: 'center',
                            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px',
                            padding: '4px 8px', outline: 'none',
                            opacity: endType !== 'occurrences' ? 0.4 : 1,
                          }}
                        />
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>occurrences</span>
                      </label>
                      {/* End date */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          checked={endType === 'end_date'}
                          onChange={() => setEndType('end_date')}
                          style={{ accentColor: 'var(--ink)' }}
                        />
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>On date</span>
                        <input
                          type="date"
                          value={recEndDate}
                          onChange={e => setRecEndDate(e.target.value)}
                          disabled={endType !== 'end_date'}
                          style={{
                            fontFamily: 'var(--f-mono)', fontSize: '11px',
                            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px',
                            padding: '4px 10px', outline: 'none',
                            opacity: endType !== 'end_date' ? 0.4 : 1,
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Preview */}
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
                    {(() => {
                      const patternLabel = recPattern === 'custom'
                        ? customDays.map((on, i) => on ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] : '').filter(Boolean).join(', ')
                        : RECURRENCE_PATTERNS.find(p => p.value === recPattern)?.label ?? '';
                      const endLabel = endType === 'occurrences'
                        ? `${occurrences || '?'} times`
                        : recEndDate ? `until ${new Date(recEndDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'no end date set';
                      const timeLabel = form.start_date && form.deadline
                        ? `${form.start_date.slice(11, 16)} – ${form.deadline.slice(11, 16)}`
                        : 'no time set';
                      return `${patternLabel} · ${timeLabel} · ${endLabel}`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* P0 conflict warning panel */}
          {p0Warning && (
            <div style={{
              border: '1.5px solid #E8A020',
              borderRadius: '14px',
              padding: '16px 18px',
              background: '#FFF8EC',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚠</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7A4800', marginBottom: '4px' }}>
                    P0 conflict — {p0Warning.conflict_type === 'employee' ? 'Employee already has an active P0' : 'Brand already has an active P0'}
                  </p>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: '#4A3000', lineHeight: 1.6 }}>
                    <strong>{p0Warning.conflicting_task.deliverable}</strong>
                    {p0Warning.conflicting_task.brand && <span style={{ color: '#7A5800' }}> · {p0Warning.conflicting_task.brand}</span>}
                  </p>
                  {p0Warning.conflicting_task.owner && (
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: '#7A5800', marginTop: '2px' }}>
                      Assigned to: {p0Warning.conflicting_task.owner}
                    </p>
                  )}
                  {p0Warning.conflicting_task.start && (
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: '#7A5800', marginTop: '2px' }}>
                      {p0Warning.conflicting_task.start}{p0Warning.conflicting_task.end ? ` – ${p0Warning.conflicting_task.end}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setP0Warning(null)}
                  style={{
                    fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
                    padding: '7px 16px', borderRadius: '999px', cursor: 'pointer',
                    background: 'transparent', border: '1px solid #E8A020', color: '#7A4800',
                  }}
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={saveWithForce}
                  disabled={loading}
                  style={{
                    fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
                    padding: '7px 16px', borderRadius: '999px', cursor: 'pointer',
                    background: '#E8A020', border: '1px solid #E8A020', color: '#fff',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Saving…' : 'Save anyway'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs font-mono text-[var(--red)]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[var(--line)] text-xs font-mono uppercase tracking-[0.1em] hover:border-[var(--ink)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.12em] hover:opacity-90 disabled:opacity-50 transition shadow-[4px_4px_0_var(--gray)]"
              style={{ background: 'var(--ink)', color: 'var(--cream)' }}
            >
              {loading ? (isEdit ? 'Saving…' : 'Assigning…') : (isEdit ? 'Save changes' : '+ Assign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
