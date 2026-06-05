'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Brand = { id: string; name: string; slug: string };
type Person = { id: string; name: string; department: string };

const TASK_TYPES = ['design', 'copy', 'video', 'seo', 'content', 'strategy', 'other'] as const;
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
    task_type: 'design' as typeof TASK_TYPES[number],
    estimated_hours: '',
    priority: 'P1' as typeof PRIORITIES[number],
    start_date: '',
    deadline: '',
    notes: '',
  });

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
    if (!form.estimated_hours) { setError('Hours are required.'); return; }

    const hours = Number(form.estimated_hours);
    const taskKey = form.task_type.toLowerCase();
    const limits = TASK_HOURS[taskKey] ?? TASK_HOURS[form.task_type] ?? null;
    if (limits) {
      if (hours < limits.min) {
        setError(`Hours too low for ${form.task_type}. Min: ${limits.min}h, Max: ${limits.max}h.`);
        return;
      }
      if (hours > limits.max) {
        setError(`Hours too high for ${form.task_type}. Min: ${limits.min}h, Max: ${limits.max}h.`);
        return;
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
          estimated_hours: Number(form.estimated_hours),
          reviewer_id: form.reviewer_id || undefined,
          start_date: form.start_date || undefined,
          deadline: form.deadline || undefined,
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

          {/* Type + Priority + Hours */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Type</label>
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
              <label className={label}>Hours</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="3"
                value={form.estimated_hours}
                onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))}
                className={input}
              />
            </div>
          </div>

          {/* Start + End date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Start date</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className={input}
              />
            </div>
            <div>
              <label className={label}>End / deadline</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
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
              {loading ? 'Assigning…' : '+ Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
