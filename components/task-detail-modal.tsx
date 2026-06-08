'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type TaskDetail = {
  id: string;
  deliverable: string;
  task_type: string;
  priority: string;
  status: string;
  estimated_hours: number | null;
  deadline: string | null;
  start_date: string | null;
  notes: string | null;
  submission_link: string | null;
  revision_round: number;
  owner_id: string;
  reviewer_id: string | null;
  brands: { id: string; name: string; colors: Record<string, string>; voice_summary: string | null } | null;
  owner: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
  references: { id: string; ref_type: string; url: string | null; caption: string | null }[];
};

type Person = { id: string; name: string; department: string };

export default function TaskDetailModal({
  taskId,
  onClose,
  canDelete = false,
  onDeleted,
}: {
  taskId: string;
  onClose: () => void;
  canDelete?: boolean;
  onDeleted?: () => void;
}) {
  const supabase = createClient();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [approving, setApproving] = useState(false);
  const [reworking, setReworking] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'rework' | 'reject' | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [showReassign, setShowReassign] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    async function fetchTask() {
      const { data } = await supabase
        .from('tasks')
        .select(`
          id, deliverable, task_type, priority, status, estimated_hours,
          deadline, start_date, notes, submission_link, revision_round,
          owner_id, reviewer_id,
          brands(id, name, colors, voice_summary),
          owner:people!tasks_owner_id_fkey(id, name),
          reviewer:people!tasks_reviewer_id_fkey(id, name),
          references:task_references(id, ref_type, url, caption)
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (data) {
        setTask(data as unknown as TaskDetail);
        setSubmissionLink((data as any).submission_link ?? '');
      }
      setLoading(false);
    }

    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: person } = await supabase
        .from('people')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle();
      setCurrentUserId(person?.id ?? null);
      setCurrentUserName(person?.name ?? '');
    }

    async function fetchPeople() {
      const { data } = await supabase.from('people').select('id, name, department').order('name');
      setPeople((data ?? []) as Person[]);
    }

    fetchTask();
    fetchUser();
    fetchPeople();
  }, [taskId]);

  async function saveLink() {
    if (!submissionLink.trim() || !task) return;
    setSavingLink(true);
    await supabase.from('tasks').update({ submission_link: submissionLink.trim() }).eq('id', task.id);
    setSavingLink(false);
  }

  async function approve() {
    if (!task) return;
    setApproving(true);
    await supabase.from('tasks').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', task.id);
    await fetch('/api/slack/notify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_approved',
        task: { deliverable: task.deliverable, brand: task.brands?.name },
        approver: currentUserName,
        person: task.owner?.name,
      }),
    });
    setApproving(false);
    onClose();
    onDeleted?.();
  }

  async function submitReview() {
    if (!feedbackNotes.trim() || !task || !reviewAction) return;
    setReworking(true);
    const newRound = (task.revision_round ?? 0) + 1;
    await supabase.from('tasks').update({ status: 'in_progress', revision_round: newRound }).eq('id', task.id);
    await supabase.from('task_revisions').insert({
      task_id: task.id,
      round: newRound,
      submission_link: task.submission_link,
      feedback_notes: feedbackNotes.trim(),
      reviewed_by_id: currentUserId,
    });
    await fetch('/api/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: reviewAction === 'reject' ? 'task_rejected' : 'task_rework_requested',
        task: { deliverable: task.deliverable, brand: task.brands?.name },
        reviewer: currentUserName,
        person: task.owner?.name,
        round: newRound,
        notes: feedbackNotes.trim(),
      }),
    });
    setReworking(false);
    onClose();
    onDeleted?.();
  }

  async function deleteTask() {
    if (!task) return;
    if (!confirm(`Delete "${task.deliverable}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      onClose();
      onDeleted?.();
    } else {
      const data = await res.json();
      alert(`Delete failed: ${data.error ?? 'Unknown error'}`);
    }
  }

  async function reassign() {
    if (!newOwnerId || !task) return;
    if (newOwnerId === task.owner_id) { setShowReassign(false); return; }
    setReassigning(true);
    const res = await fetch(`/api/tasks/${task.id}/reassign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
    setReassigning(false);
    if (res.ok) {
      onClose();
      onDeleted?.();
    } else {
      const d = await res.json();
      alert(d.error ?? 'Reassign failed.');
    }
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const PRIORITY_COLOR: Record<string, string> = {
    P0: 'var(--red)',
    P1: 'var(--ink)',
    P2: 'var(--gray)',
  };

  const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    ready_for_review: 'Ready for Review',
    approved: 'Approved',
    done: 'Done',
    cancelled: 'Cancelled',
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="modal-inner"
        style={{ width: '100%', maxWidth: '600px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '12px 12px 0 var(--ink)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>Loading…</p>
          </div>
        ) : !task ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--red)' }}>Task not found.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>
                  {task.brands?.name}
                </p>
                <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '10px' }}>
                  {task.deliverable}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: PRIORITY_COLOR[task.priority] ?? 'var(--ink)', color: task.priority === 'P2' ? 'var(--ink)' : '#fff', padding: '2px 10px', borderRadius: '999px' }}>
                    {task.priority}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                    {task.task_type}
                  </span>
                  {task.estimated_hours && (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                      {task.estimated_hours}h
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', color: 'var(--gray)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>×</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* People */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {task.owner && (
                  <div>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>Assigned to</p>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{task.owner.name}</p>
                  </div>
                )}
                {task.reviewer && (
                  <div>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>Reviewer</p>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{task.reviewer.name}</p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {(task.start_date || task.deadline) && (
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {task.start_date && (
                    <div>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>Start</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px' }}>
                        {new Date(task.start_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                      </p>
                    </div>
                  )}
                  {task.deadline && (
                    <div>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>Deadline</p>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px' }}>
                        {new Date(task.deadline).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {task.notes && (
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '6px' }}>Notes</p>
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--ink)' }}>{task.notes}</p>
                </div>
              )}

              {/* Brand voice */}
              {task.brands?.voice_summary && (
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '6px' }}>Brand voice</p>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--gray)' }}>{task.brands.voice_summary}</p>
                </div>
              )}

              {/* Brand colors */}
              {task.brands?.colors && Object.keys(task.brands.colors).length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '8px' }}>Brand colors</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {Object.entries(task.brands.colors).map(([name, hex]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: hex, border: '1px solid var(--line)' }} />
                        <div>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>{name}</p>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px' }}>{hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* References */}
              {task.references.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '8px' }}>References</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {task.references.map(ref => (
                      <div key={ref.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', width: '60px', flexShrink: 0 }}>{ref.ref_type}</span>
                        {ref.url ? (
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--cobalt)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ref.caption ?? ref.url}
                          </a>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--gray)' }}>{ref.caption}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission URL */}
              <div>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '8px' }}>Submission URL</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={submissionLink}
                    onChange={e => setSubmissionLink(e.target.value)}
                    placeholder="Figma, Drive, Notion, any link..."
                    style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '9px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={saveLink}
                    disabled={savingLink || !submissionLink.trim()}
                    style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '9px 18px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: savingLink || !submissionLink.trim() ? 'not-allowed' : 'pointer', opacity: savingLink || !submissionLink.trim() ? 0.4 : 1, whiteSpace: 'nowrap' }}
                  >
                    {savingLink ? '…' : 'Save'}
                  </button>
                </div>
                {submissionLink && (
                  <a href={submissionLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--cobalt)', textDecoration: 'underline', marginTop: '6px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {submissionLink}
                  </a>
                )}
              </div>

              {/* Revision round */}
              {(task.revision_round ?? 0) > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>Revision</p>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--red)' }}>Round {task.revision_round}</p>
                </div>
              )}
            </div>

            {/* Feedback input — shown when rework or reject is selected */}
            {reviewAction && (
              <div style={{ padding: '0 32px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: reviewAction === 'reject' ? 'var(--red)' : 'var(--gray)' }}>
                  {reviewAction === 'reject' ? 'Rejection reason (required)' : 'Rework feedback (required)'}
                </p>
                <textarea
                  autoFocus
                  rows={3}
                  value={feedbackNotes}
                  onChange={e => setFeedbackNotes(e.target.value)}
                  placeholder={reviewAction === 'reject' ? 'What is wrong? What needs to be redone from scratch?' : 'What specifically needs to change?'}
                  style={{ background: 'var(--paper)', border: `1px solid ${reviewAction === 'reject' ? 'var(--red)' : 'var(--ink)'}`, borderRadius: '12px', padding: '12px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }}
                />
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '16px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                {canDelete && (
                  <button
                    onClick={deleteTask}
                    disabled={deleting}
                    style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: '999px', padding: '8px 14px', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                )}
                {canDelete && !showReassign && (
                  <button
                    onClick={() => { setShowReassign(true); setNewOwnerId(task?.owner_id ?? ''); }}
                    style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer' }}
                  >
                    Reassign
                  </button>
                )}
                {canDelete && showReassign && (
                  <>
                    <select
                      value={newOwnerId}
                      onChange={e => setNewOwnerId(e.target.value)}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '10px', padding: '8px 12px', outline: 'none', maxWidth: '180px' }}
                    >
                      {people.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={reassign}
                      disabled={reassigning}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 18px', cursor: reassigning ? 'not-allowed' : 'pointer', opacity: reassigning ? 0.5 : 1 }}
                    >
                      {reassigning ? '…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowReassign(false)}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
                {/* Approve / Rework / Reject — reviewer only, ready_for_review only */}
                {task && task.status === 'ready_for_review' && currentUserId === task.reviewer_id && (
                  <>
                    {!reviewAction ? (
                      <>
                        <button
                          onClick={approve}
                          disabled={approving}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#2a9d5c', color: '#fff', border: '1px solid #2a9d5c', borderRadius: '999px', padding: '8px 14px', cursor: approving ? 'not-allowed' : 'pointer', opacity: approving ? 0.5 : 1 }}
                        >
                          {approving ? '…' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => { setReviewAction('rework'); setFeedbackNotes(''); }}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer' }}
                        >
                          ↺ Rework
                        </button>
                        <button
                          onClick={() => { setReviewAction('reject'); setFeedbackNotes(''); }}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'var(--red)', color: '#fff', border: '1px solid var(--red)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer' }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={submitReview}
                          disabled={reworking || !feedbackNotes.trim()}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: reviewAction === 'reject' ? 'var(--red)' : 'var(--ink)', color: '#fff', border: `1px solid ${reviewAction === 'reject' ? 'var(--red)' : 'var(--ink)'}`, borderRadius: '999px', padding: '10px 18px', cursor: reworking || !feedbackNotes.trim() ? 'not-allowed' : 'pointer', opacity: reworking || !feedbackNotes.trim() ? 0.4 : 1 }}
                        >
                          {reworking ? '…' : reviewAction === 'reject' ? 'Confirm reject' : 'Send rework'}
                        </button>
                        <button
                          onClick={() => { setReviewAction(null); setFeedbackNotes(''); }}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </>
                )}
                <button
                  onClick={onClose}
                  style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 14px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
