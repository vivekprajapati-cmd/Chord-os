'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { MOCK_TASKS, MOCK_PEOPLE } from '@/lib/mock-data';

type Task = typeof MOCK_TASKS[number] & { estimated_hours: number | null; owner_id: string; meeting_id: string | null };

const PRIORITY_STYLE: Record<string, CSSProperties> = {
  P0: { background: 'var(--red)', color: '#fff' },
  P1: { background: 'var(--ink)', color: 'var(--cream)' },
  P2: { border: '1px solid var(--ink)' },
};

const STATUS_ORDER = ['in_progress', 'scheduled', 'ready_for_review', 'approved', 'done'];
const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  ready_for_review: 'Ready for Review',
  approved: 'Approved',
  done: 'Done',
};

const inputStyle = {
  width: '100%',
  background: 'var(--cream)',
  border: '1px solid var(--ink)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '6px',
};

function EditModal({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (updated: Partial<Task>) => void;
}) {
  const [deliverable, setDeliverable] = useState(task.deliverable);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [ownerId, setOwnerId] = useState(task.owner_id);
  const [hours, setHours] = useState(task.estimated_hours?.toString() ?? '');
  const [deadline, setDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--ink)', overflow: 'hidden' }}>

        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>
              {task.brands?.name} · Edit Task
            </p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '28px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Edit</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Deliverable</label>
            <input value={deliverable} onChange={e => setDeliverable(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Assignee</label>
            <select value={ownerId} onChange={e => setOwnerId(e.target.value)} style={inputStyle}>
              {MOCK_PEOPLE.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.department}</option>
              ))}
            </select>
          </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Hours (optional)</label>
              <input type="number" min="0" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 3" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              const newOwner = MOCK_PEOPLE.find(p => p.id === ownerId);
              onSave({
                deliverable,
                priority,
                status,
                owner_id: ownerId,
                owner: newOwner ? { name: newOwner.name } : task.owner,
                estimated_hours: hours ? parseFloat(hours) : undefined,
                deadline: deadline ? new Date(deadline).toISOString() : undefined,
              });
            }}
            style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px 16px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Save changes
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 16px', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DemoTasksPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS as Task[]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function handleSave(updated: Partial<Task>) {
    if (!editingTask) return;
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updated } as Task : t));
    setEditingTask(null);
  }

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-5xl uppercase tracking-tight">Tasks</h1>
        <div className="flex gap-2">
          {[{ label: 'Active', active: true }, { label: 'Review queue', active: false }, { label: 'Done', active: false }].map(({ label, active }) => (
            <span key={label} style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 14px', borderRadius: '999px', border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`, background: active ? 'var(--ink)' : 'transparent', color: active ? 'var(--cream)' : 'var(--ink)', cursor: 'default' }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {STATUS_ORDER.filter(s => (grouped[s]?.length ?? 0) > 0).map(status => (
        <section key={status}>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-2">
            {STATUS_LABEL[status]} ({grouped[status].length})
          </p>
          <div className="space-y-2">
            {grouped[status].map(task => (
              <div key={task.id} className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-mono uppercase text-[var(--gray)]">{task.brands?.name}</p>
                    {task.meeting_id && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(34,38,217,0.07)', color: '#2226D9', border: '1px solid rgba(34,38,217,0.2)', borderRadius: '999px', padding: '1px 7px' }}>Briefing</span>
                    )}
                  </div>
                  <p className="font-medium truncate">{task.deliverable}</p>
                  <p className="text-xs text-[var(--gray)]">
                    {task.owner?.name}
                    {task.estimated_hours ? ` · ${task.estimated_hours}h` : ''}
                    {task.deadline && ` · due ${new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded" style={PRIORITY_STYLE[task.priority] ?? {}}>{task.priority}</span>
                  <span className="text-xs font-mono uppercase text-[var(--gray)] w-16 text-right capitalize">{task.task_type}</span>
                  <button
                    onClick={() => setEditingTask(task)}
                    style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid var(--line)', borderRadius: '999px', padding: '3px 10px', background: 'transparent', color: 'var(--gray)', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {editingTask && <EditModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleSave} />}
    </div>
  );
}
