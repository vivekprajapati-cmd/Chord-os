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
const PRIORITIES = ['P0', 'P1', 'P2'] as const;

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
  const overlayRef = useRef<HTMLDivElement>(null);

  const isEdit = !!editTask;

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
        if (hours < limits.min) {
          setError(`Duration too short for "${form.task_name}". Minimum is ${limits.min}h.`);
          return;
        }
        if (hours > limits.max) {
          setError(`Duration too long for "${form.task_name}". Maximum is ${limits.max}h.`);
          return;
        }
      }
    }

    setLoading(true);
    setError('');
    try {
      const url = isEdit ? `/api/tasks/${editTask!.id}` : '/api/tasks';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reviewer_id: form.reviewer_id || undefined,
          notes: form.notes || undefined,
          ownerName: people.find(p => p.id === form.owner_id)?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
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

          {/* Priority + Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as typeof PRIORITIES[number] }))}
                className={input}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>
                Hours {(() => { const l = TASK_HOURS[form.task_name.toLowerCase()]; return l ? `(${l.min}h–${l.max}h)` : ''; })()}
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
