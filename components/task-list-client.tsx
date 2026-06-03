'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import TaskEditModal from './task-edit-modal';

type Task = {
  id: string;
  deliverable: string;
  task_type: string;
  priority: string;
  status: string;
  estimated_hours: number | null;
  deadline: string | null;
  meeting_id: string | null;
  owner_id: string;
  reviewer_id: string | null;
  brands: { name: string } | null;
  owner: { name: string } | null;
};

type Person = { id: string; name: string; department: string };

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

export default function TaskListClient({
  tasks: initialTasks,
  people,
  canEdit,
  statusFilter,
}: {
  tasks: Task[];
  people: Person[];
  canEdit: boolean;
  statusFilter?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function handleSaved() {
    // Refresh page to pull updated data from server
    window.location.reload();
  }

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  return (
    <>
      {STATUS_ORDER.filter(s => (grouped[s]?.length ?? 0) > 0).map(status => (
        <section key={status}>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-2">
            {STATUS_LABEL[status]} ({grouped[status].length})
          </p>
          <div className="space-y-2">
            {grouped[status].map(task => (
              <div
                key={task.id}
                className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-mono uppercase text-[var(--gray)]">{task.brands?.name}</p>
                    {task.meeting_id && (
                      <span style={{
                        fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase',
                        letterSpacing: '0.08em', background: 'rgba(34,38,217,0.07)', color: '#2226D9',
                        border: '1px solid rgba(34,38,217,0.2)', borderRadius: '999px', padding: '1px 7px',
                      }}>Briefing</span>
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
                  <span
                    className="text-xs font-mono uppercase px-2 py-0.5 rounded"
                    style={PRIORITY_STYLE[task.priority] ?? {}}
                  >
                    {task.priority}
                  </span>
                  <span className="text-xs font-mono uppercase text-[var(--gray)] w-16 text-right capitalize">
                    {task.task_type}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => setEditingTask(task)}
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        border: '1px solid var(--line)',
                        borderRadius: '999px',
                        padding: '3px 10px',
                        background: 'transparent',
                        color: 'var(--gray)',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {tasks.length === 0 && (
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-10 text-center">
          <p className="text-[var(--gray)]">No tasks here.</p>
        </div>
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          people={people}
          onClose={() => setEditingTask(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
