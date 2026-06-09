'use client';

import { useState } from 'react';
import TaskDetailModal from './task-detail-modal';

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
  owner_id: string;
  reviewer_id: string | null;
  submission_link: string | null;
  meeting_id: string | null;
  notes: string | null;
  brand_id: string;
  brands: { name: string } | null;
  owner: { name: string } | null;
};

type Person = { id: string; name: string; department: string };
type Brand = { id: string; name: string; slug: string };

const DEPT_ORDER = ['Leadership', 'Ops', 'Account', 'Creative', 'Video', 'SEO', 'Content', 'Sales', 'Marketing'];

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  ready_for_review: 'In Review',
  approved: 'Approved',
  done: 'Done',
  delayed: 'Delayed',
};

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  P0: { background: 'var(--red)', color: '#fff' },
  P1: { background: 'var(--ink)', color: 'var(--cream)' },
  P2: { border: '1px solid var(--ink)' },
};

export default function TaskTeamView({
  tasks,
  people,
  canEdit,
  onSubmit,
  onEdit,
  onDetail,
}: {
  tasks: Task[];
  people: Person[];
  brands: Brand[];
  canEdit: boolean;
  onSubmit?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDetail?: (id: string) => void;
}) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Build person lookup
  const personById = Object.fromEntries(people.map(p => [p.id, p]));

  // Group people by department
  const deptPeople: Record<string, Person[]> = {};
  people.forEach(p => {
    if (!deptPeople[p.department]) deptPeople[p.department] = [];
    deptPeople[p.department].push(p);
  });

  // Get departments that have at least one task, sorted by DEPT_ORDER
  const activeDepts = [
    ...DEPT_ORDER.filter(d => deptPeople[d]),
    ...Object.keys(deptPeople).filter(d => !DEPT_ORDER.includes(d)),
  ].filter(dept => {
    const ids = new Set(deptPeople[dept]?.map(p => p.id) ?? []);
    return tasks.some(t => ids.has(t.owner_id));
  });

  function getDeptStats(dept: string) {
    const ids = new Set(deptPeople[dept]?.map(p => p.id) ?? []);
    const deptTasks = tasks.filter(t => ids.has(t.owner_id));

    const inProgress = deptTasks.filter(t => t.status === 'in_progress').length;
    const scheduled = deptTasks.filter(t => t.status === 'scheduled').length;
    const inReview = deptTasks.filter(t => t.status === 'ready_for_review').length;
    const delayed = deptTasks.filter(t => {
      if (['done', 'approved', 'cancelled'].includes(t.status)) return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) < new Date();
    }).length;
    const totalHours = deptTasks.reduce((acc, t) => acc + (t.estimated_hours ?? 0), 0);

    return { deptTasks, inProgress, scheduled, inReview, delayed, totalHours: Math.round(totalHours * 10) / 10 };
  }

  return (
    <>
      <div className="space-y-3">
        {activeDepts.map(dept => {
          const { deptTasks, inProgress, scheduled, inReview, delayed, totalHours } = getDeptStats(dept);
          const isExpanded = expandedDept === dept;
          const memberCount = (deptPeople[dept] ?? []).length;

          return (
            <div key={dept} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
              {/* Department header row */}
              <div
                onClick={() => setExpandedDept(isExpanded ? null : dept)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                className="hover:bg-[var(--cream)] transition-colors"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '15px' }}>{dept}</p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>
                      {memberCount} {memberCount === 1 ? 'person' : 'people'} · {deptTasks.length} tasks · {totalHours}h allocated
                    </p>
                  </div>

                  {/* Status chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {inProgress > 0 && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--cobalt)', color: '#fff', borderRadius: '999px', padding: '2px 8px' }}>
                        {inProgress} active
                      </span>
                    )}
                    {scheduled > 0 && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--ink)', color: 'var(--cream)', borderRadius: '999px', padding: '2px 8px' }}>
                        {scheduled} scheduled
                      </span>
                    )}
                    {inReview > 0 && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--coral)', color: '#fff', borderRadius: '999px', padding: '2px 8px' }}>
                        {inReview} in review
                      </span>
                    )}
                    {delayed > 0 && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--red)', color: '#fff', borderRadius: '999px', padding: '2px 8px' }}>
                        {delayed} delayed
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', flexShrink: 0 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {/* Expanded task list */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {deptTasks.length === 0 ? (
                    <p style={{ padding: '16px 20px', fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No tasks.</p>
                  ) : (
                    deptTasks.map((task, i) => (
                      <div
                        key={task.id}
                        onClick={() => onDetail ? onDetail(task.id) : setDetailTaskId(task.id)}
                        style={{ padding: '12px 20px', borderBottom: i < deptTasks.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--cream)' }}
                        className="hover:bg-[var(--paper)] transition-colors"
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '2px' }}>
                            {task.brands?.name}
                          </p>
                          <p style={{ fontWeight: 500, fontSize: '13px', marginBottom: '2px' }}>{task.deliverable}</p>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                            {personById[task.owner_id]?.name ?? '—'}
                            {task.estimated_hours ? ` · ${task.estimated_hours}h` : ''}
                            {task.deadline ? ` · due ${new Date(task.deadline).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', ...PRIORITY_STYLE[task.priority], borderRadius: '4px', padding: '2px 8px' }}>
                            {task.priority}
                          </span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '2px 8px' }}>
                            {STATUS_LABEL[task.status] ?? task.status}
                          </span>
                          {(task.status === 'in_progress' || task.status === 'scheduled') && onSubmit && (
                            <button
                              onClick={e => { e.stopPropagation(); onSubmit(task); }}
                              style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid var(--coral)', borderRadius: '999px', padding: '3px 10px', background: 'transparent', color: 'var(--coral)', cursor: 'pointer' }}
                            >
                              Submit
                            </button>
                          )}
                          {canEdit && onEdit && (
                            <button
                              onClick={e => { e.stopPropagation(); onEdit(task); }}
                              style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid var(--line)', borderRadius: '999px', padding: '3px 10px', background: 'transparent', color: 'var(--gray)', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {activeDepts.length === 0 && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--f-mono)', fontSize: '12px' }}>No tasks found.</p>
          </div>
        )}
      </div>

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          canDelete={canEdit}
          onDeleted={() => { setDetailTaskId(null); window.location.reload(); }}
        />
      )}
    </>
  );
}
