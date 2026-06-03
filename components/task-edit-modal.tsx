'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Task = {
  id: string;
  deliverable: string;
  priority: string;
  estimated_hours: number | null;
  deadline: string | null;
  status: string;
  owner_id: string;
  reviewer_id: string | null;
  brands: { name: string } | null;
  owner: { name: string } | null;
};

type Person = { id: string; name: string; department: string };

export default function TaskEditModal({ task, people, onClose, onSaved }: {
  task: Task;
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deliverable, setDeliverable] = useState(task.deliverable);
  const [priority, setPriority] = useState(task.priority);
  const [hours, setHours] = useState(task.estimated_hours?.toString() ?? '');
  const [deadline, setDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );
  const [status, setStatus] = useState(task.status);
  const [ownerId, setOwnerId] = useState(task.owner_id);
  const [reviewerId, setReviewerId] = useState(task.reviewer_id ?? '');
  const [error, setError] = useState('');

  async function save() {
    if (!deliverable.trim()) { setError('Deliverable cannot be empty.'); return; }
    setLoading(true);
    setError('');

    const updates: Record<string, unknown> = {
      deliverable: deliverable.trim(),
      priority,
      status,
      owner_id: ownerId,
      reviewer_id: reviewerId || null,
      estimated_hours: hours ? parseFloat(hours) : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    };

    const { error: err } = await supabase.from('tasks').update(updates).eq('id', task.id);
    if (err) { setError(err.message); setLoading(false); return; }

    // Handle block transfer if owner changed
    if (ownerId !== task.owner_id) {
      const newOwnerName = people.find(p => p.id === ownerId)?.name ?? ownerId;

      // Cancel only the old owner's scheduled block
      await supabase
        .from('blocks')
        .update({ status: 'cancelled' })
        .eq('task_id', task.id)
        .eq('person_id', task.owner_id)
        .eq('status', 'scheduled');

      // Create new block for new owner if task has hours
      const newHours = hours ? parseFloat(hours) : task.estimated_hours;
      if (newHours && newHours > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const startAt = tomorrow.toISOString();
        const endAt = new Date(tomorrow.getTime() + newHours * 3600000).toISOString();
        await supabase.from('blocks').insert({
          task_id: task.id,
          person_id: ownerId,
          start_at: startAt,
          end_at: endAt,
          status: 'scheduled',
        });
      }

      // Slack notification
      const { data: { user } } = await supabase.auth.getUser();
      const { data: actor } = await supabase.from('people').select('name').eq('email', user?.email ?? '').maybeSingle();
      await fetch('/api/slack/notify', {
        method: 'POST',
        body: JSON.stringify({
          type: 'task_reassigned',
          task: { deliverable: task.deliverable },
          from: task.owner?.name ?? 'previous owner',
          to: newOwnerName,
          by: actor?.name ?? 'a lead',
        }),
      });
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--cream)',
    border: '1px solid var(--ink)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontFamily: 'var(--f-body)',
    fontSize: '14px',
    color: 'var(--ink)',
    outline: 'none',
  };

  const labelStyle = {
    fontFamily: 'var(--f-mono)',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--gray)',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--ink)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>
              {task.brands?.name} · Edit Task
            </p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '28px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Edit
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Deliverable */}
          <div>
            <label style={labelStyle}>Deliverable</label>
            <input
              value={deliverable}
              onChange={e => setDeliverable(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Assignee + Reviewer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Assignee</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} style={inputStyle}>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Reviewer</label>
              <select value={reviewerId} onChange={e => setReviewerId(e.target.value)} style={inputStyle}>
                <option value="">— None —</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                <option value="P0">P0 — Critical</option>
                <option value="P1">P1 — High</option>
                <option value="P2">P2 — Normal</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="ready_for_review">Ready for Review</option>
                <option value="approved">Approved</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Hours + Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Hours (optional)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="e.g. 3"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button
            onClick={save}
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--ink)',
              color: 'var(--cream)',
              padding: '12px 16px',
              borderRadius: '999px',
              border: '1px solid var(--ink)',
              fontFamily: 'var(--f-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--ink)',
              color: 'var(--ink)',
              padding: '12px 16px',
              borderRadius: '999px',
              fontFamily: 'var(--f-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
