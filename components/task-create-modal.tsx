'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Brand = { id: string; name: string; slug: string };
type Person = { id: string; name: string; department: string };

const TASK_TYPES = ['design', 'copy', 'video', 'seo', 'content', 'strategy', 'other'] as const;
const PRIORITIES = ['P0', 'P1', 'P2'] as const;

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
    deliverable: '',
    task_type: 'design' as typeof TASK_TYPES[number],
    estimated_hours: '',
    priority: 'P1' as typeof PRIORITIES[number],
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
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimated_hours: Number(form.estimated_hours),
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

          {/* Deadline */}
          <div>
            <label className={label}>Deadline (blocks calendar up to this time)</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className={input}
            />
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
