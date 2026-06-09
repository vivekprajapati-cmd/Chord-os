'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import TaskCreateModal from './task-create-modal';
import TaskDetailModal from './task-detail-modal';
import TaskTeamView from './task-team-view';
import { createClient } from '@/lib/supabase/client';

type Task = {
  id: string;
  deliverable: string;
  task_type: string;
  task_name: string | null;
  priority: string;
  status: string;
  estimated_hours: number | null;
  start_date: string | null;
  deadline: string | null;
  meeting_id: string | null;
  owner_id: string;
  reviewer_id: string | null;
  submission_link: string | null;
  notes: string | null;
  brand_id: string;
  brands: { name: string } | null;
  owner: { name: string } | null;
};

type Person = { id: string; name: string; department: string }
type Brand = { id: string; name: string; slug: string };

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
  brands,
  canEdit,
  statusFilter,
  currentUserName,
}: {
  tasks: Task[];
  people: Person[];
  brands: Brand[];
  canEdit: boolean;
  statusFilter?: string;
  currentUserName?: string;
}) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'status' | 'team'>('status');
  const [search, setSearch] = useState('');

  function handleSaved() {
    window.location.reload();
  }

  async function handleSubmit() {
    if (!submittingTask || !submissionLink.trim()) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const onTime = submittingTask.deadline ? new Date(now) <= new Date(submittingTask.deadline) : true;

    await supabase.from('tasks').update({
      status: 'ready_for_review',
      submitted_at: now,
      submission_link: submissionLink.trim(),
      on_time: onTime,
      done_marked_at: now,
    }).eq('id', submittingTask.id);

    await fetch('/api/slack/notify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_submitted',
        task: { deliverable: submittingTask.deliverable, brand: submittingTask.brands?.name },
        person: currentUserName || submittingTask.owner?.name,
        reviewer: '',
        link: submissionLink.trim(),
      }),
    });

    setSubmitting(false);
    setSubmittingTask(null);
    setSubmissionLink('');
    window.location.reload();
  }

  const searchLower = search.toLowerCase();
  const filteredTasks = searchLower
    ? tasks.filter(t =>
        t.deliverable.toLowerCase().includes(searchLower) ||
        (t.brands?.name ?? '').toLowerCase().includes(searchLower) ||
        (t.owner?.name ?? '').toLowerCase().includes(searchLower)
      )
    : tasks;

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = filteredTasks.filter(t => t.status === s);
    return acc;
  }, {});


  const toggleStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--f-mono)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '5px 14px',
    borderRadius: '999px',
    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--cream)' : 'var(--gray)',
    cursor: 'pointer',
  });

  return (
    <>
      {/* Search + view toggle row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks, brands, people…"
          style={{
            flex: '1 1 200px', minWidth: '180px', maxWidth: '320px',
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: '999px', padding: '7px 16px',
            fontFamily: 'var(--f-mono)', fontSize: '11px', outline: 'none', color: 'var(--ink)',
          }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={toggleStyle(viewMode === 'status')} onClick={() => setViewMode('status')}>By Status</button>
          <button style={toggleStyle(viewMode === 'team')} onClick={() => setViewMode('team')}>By Team</button>
        </div>
      </div>

      {viewMode === 'team' && (
        <TaskTeamView
          tasks={filteredTasks}
          people={people}
          brands={brands}
          canEdit={canEdit}
          onSubmit={(task) => { setSubmittingTask(task); setSubmissionLink(''); }}
          onEdit={(task) => setEditingTask(task)}
          onDetail={(id) => setDetailTaskId(id)}
        />
      )}

      {viewMode === 'status' && <>
      {STATUS_ORDER.filter(s => (grouped[s]?.length ?? 0) > 0).map(status => (

        <section key={status}>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-2">
            {STATUS_LABEL[status]} ({grouped[status].length})
          </p>
          <div className="space-y-2">
            {grouped[status].map(task => (
              <div
                key={task.id}
                className="card-hover p-4 flex items-center justify-between"
                style={{ transition: 'box-shadow 0.18s ease', cursor: 'pointer' }}
                onClick={() => setDetailTaskId(task.id)}
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
                    {task.deadline && ` · due ${new Date(task.deadline).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}`}
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
                  {/* Submit button — shown for in_progress and scheduled tasks */}
                  {(task.status === 'in_progress' || task.status === 'scheduled') && (
                    <button
                      onClick={e => { e.stopPropagation(); setSubmittingTask(task); setSubmissionLink(''); }}
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        border: '1px solid var(--coral)',
                        borderRadius: '999px',
                        padding: '3px 10px',
                        background: 'transparent',
                        color: 'var(--coral)',
                        cursor: 'pointer',
                      }}
                    >
                      Submit
                    </button>
                  )}
                  {task.status === 'ready_for_review' && (
                    <>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.06em' }}>
                        ✓ In review
                      </span>
                      {task.submission_link && (
                        <a
                          href={task.submission_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cobalt)', textDecoration: 'none', border: '1px solid var(--cobalt)', borderRadius: '999px', padding: '3px 10px' }}
                        >
                          View →
                        </a>
                      )}
                    </>
                  )}
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditingTask(task); }}
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

      {filteredTasks.length === 0 && (
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-10 text-center">
          <p className="text-[var(--gray)]">{search ? 'No tasks match your search.' : 'No tasks here.'}</p>
        </div>
      )}
      </>}

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          canDelete={canEdit}
          onDeleted={() => { setDetailTaskId(null); window.location.reload(); }}
        />
      )}

      {editingTask && (
        <TaskCreateModal
          brands={brands}
          people={people}
          editTask={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); handleSaved(); }}
        />
      )}

      {/* Submission modal */}
      {submittingTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--coral)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '4px' }}>{submittingTask.brands?.name}</p>
                <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '24px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{submittingTask.deliverable}</h2>
              </div>
              <button onClick={() => setSubmittingTask(null)} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)' }}>Submission URL</p>
              <input
                value={submissionLink}
                onChange={e => setSubmissionLink(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Paste Google Drive / Figma / any URL"
                autoFocus
                style={{ width: '100%', background: 'var(--paper)', border: '1px solid var(--ink)', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
              />
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                This will move the task to Review queue and notify the reviewer.
              </p>
            </div>
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || !submissionLink.trim()}
                style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: submitting || !submissionLink.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !submissionLink.trim() ? 0.5 : 1 }}
              >
                {submitting ? 'Submitting…' : '✓ Submit for review'}
              </button>
              <button
                onClick={() => setSubmittingTask(null)}
                style={{ background: 'transparent', border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 20px', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
