'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Brand = { id: string; name: string; slug: string };
type Person = { id: string; name: string; department: string };

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

export default function TaskCreateModal({
  brands,
  people,
  onClose,
}: {
  brands: Brand[];
  people: Person[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    brand_id: brands[0]?.id ?? '',
    owner_id: people[0]?.id ?? '',
    reviewer_id: '',
    deliverable: '',
    task_name: 'Static',
    task_type: 'design' as typeof TASK_TYPES[number],
    priority: 'P1' as typeof PRIORITIES[number],
    start_date: '',
    deadline: '',
    notes: '',
  });

  // Auto-calculate hours from start/end
  const calculatedHours = (() => {
    if (!form.start_date || !form.deadline) return null;
    const diff = new Date(form.deadline).getTime() - new Date(form.start_date).getTime();
    if (diff <= 0) return null;
    return Math.round((diff / 3600000) * 10) / 10;
  })();

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

    const hours = calculatedHours;
    if (hours !== null) {
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
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reviewer_id: form.reviewer_id || undefined,
          notes: form.notes || undefined,
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
            Assign Task
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
              <select
                value={form.owner_id}
                onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                className={input}
              >
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.department}</option>
                ))}
              </select>
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

          {/* Priority */}
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

          {/* Start + End date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Start date & time *</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className={input}
              />
            </div>
            <div>
              <label className={label}>End date & time *</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className={input}
              />
            </div>
          </div>

          {/* Calculated hours display */}
          {calculatedHours !== null && (
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', letterSpacing: '0.08em' }}>
              DURATION: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{calculatedHours}h</span>
              {(() => {
                const l = TASK_HOURS[form.task_name.toLowerCase()];
                if (!l) return null;
                const ok = calculatedHours >= l.min && calculatedHours <= l.max;
                return (
                  <span style={{ marginLeft: 8, color: ok ? 'var(--green, #2a9d5c)' : 'var(--red)' }}>
                    {ok ? `within range (${l.min}h–${l.max}h)` : `outside expected range (${l.min}h–${l.max}h)`}
                  </span>
                );
              })()}
            </p>
          )}

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
              {loading ? 'Assigning…' : '+ Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
