'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BlockWithTask } from '@/app/(app)/calendar/page';

export default function ContextModal({ block, onClose }: {
  block: BlockWithTask;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const task = block.tasks;
  const [done, setDone] = useState(block.status === 'done' || block.status === 'ready_for_review');
  const [acknowledged, setAcknowledged] = useState(!!(task as any).acknowledged_at);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isReviewer, setIsReviewer] = useState(false);
  const [submissionLink, setSubmissionLink] = useState((task as any).submission_link ?? '');
  const [showSubmitInput, setShowSubmitInput] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [reworkNotes, setReworkNotes] = useState('');
  const [showReworkInput, setShowReworkInput] = useState(false);
  const brand = task.brands;
  const colors = brand.colors ?? {};
  const revisionRound = (task as any).revision_round ?? 0;

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: person } = await supabase
        .from('people')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle();
      setCurrentUserId(person?.id ?? null);
      setCurrentUserName(person?.name ?? '');
      setIsReviewer(person?.id === task.reviewer_id);
    }
    checkUser();
  }, []);

  async function acknowledge() {
    setLoading(true);
    await supabase.from('tasks').update({ acknowledged_at: new Date().toISOString() }).eq('id', task.id);
    await fetch('/api/slack/notify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_acknowledged',
        task: { deliverable: task.deliverable, brand: brand.name },
        person: currentUserName,
      }),
    });
    setAcknowledged(true);
    setLoading(false);
  }

  async function saveSubmissionLink() {
    if (!submissionLink.trim()) return;
    setSavingLink(true);
    await supabase.from('tasks').update({ submission_link: submissionLink.trim() }).eq('id', task.id);
    setSavingLink(false);
  }

  async function markDone() {
    if (!submissionLink.trim()) { setShowSubmitInput(true); return; }
    setLoading(true);
    const now = new Date().toISOString();
    const deadline = (task as any).deadline;
    const onTime = deadline ? new Date(now) <= new Date(deadline) : true;

    await supabase.from('blocks').update({ status: 'done', actual_hours: task.estimated_hours }).eq('id', block.id);
    await supabase.from('tasks').update({
      status: 'ready_for_review',
      done_marked_at: now,
      submitted_at: now,
      submission_link: submissionLink.trim(),
      on_time: onTime,
    }).eq('id', task.id);

    await fetch('/api/slack/notify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_submitted',
        task: { deliverable: task.deliverable, brand: brand.name },
        person: currentUserName,
        reviewer: task.reviewer?.name ?? '',
        link: submissionLink.trim(),
      }),
    });

    setDone(true);
    setLoading(false);
  }

  async function approve() {
    setLoading(true);
    await supabase.from('tasks').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', task.id);
    await fetch('/api/slack/notify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_approved',
        task: { deliverable: task.deliverable, brand: brand.name },
        approver: currentUserName,
        person: task.owner?.name,
      }),
    });
    setDone(true);
    setLoading(false);
    onClose();
  }

  async function requestRework() {
    if (!reworkNotes.trim()) { setShowReworkInput(true); return; }
    setLoading(true);
    const newRound = revisionRound + 1;

    await supabase.from('tasks').update({ status: 'scheduled', revision_round: newRound }).eq('id', task.id);

    // Log revision
    await supabase.from('task_revisions').insert({
      task_id: task.id,
      round: newRound,
      submission_link: (task as any).submission_link,
      feedback_notes: reworkNotes.trim(),
      reviewed_by_id: currentUserId,
    });

    await fetch('/api/slack/notify', {
      method: 'POST',
      body: JSON.stringify({
        type: 'task_rework_requested',
        task: { deliverable: task.deliverable, brand: brand.name },
        reviewer: currentUserName,
        person: task.owner?.name,
        round: newRound,
        notes: reworkNotes.trim(),
      }),
    });

    // Alert if revision threshold exceeded
    if (newRound >= 3) {
      await fetch('/api/slack/notify', {
        method: 'POST',
        body: JSON.stringify({
          type: 'revision_threshold',
          task: { deliverable: task.deliverable, brand: brand.name },
          round: newRound,
        }),
      });
    }

    setLoading(false);
    onClose();
  }

  return (
    <div className="modal-wrap" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-inner" style={{ width: '100%', maxWidth: '600px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '12px 12px 0 var(--ink)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>{brand.name}</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '36px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '12px' }}>{task.deliverable}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontFamily: 'var(--f-mono)', color: 'var(--gray)' }}>
              <span>{task.estimated_hours}h</span>
              <span>·</span>
              <span>{task.priority}</span>
              <span>·</span>
              <span style={{ textTransform: 'capitalize' }}>{task.task_type}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', color: 'var(--gray)', cursor: 'pointer', padding: 0, marginLeft: '16px' }}>×</button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Brand identity strip */}
          {Object.keys(colors).length > 0 && (
            <Section label="Brand Colors">
              <div className="flex gap-3 flex-wrap">
                {Object.entries(colors).map(([name, hex]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-[var(--line)] shadow-sm" style={{ background: hex }} />
                    <div>
                      <p className="text-xs font-mono uppercase text-[var(--gray)]">{name}</p>
                      <p className="text-xs font-mono">{hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {brand.voice_summary && (
            <Section label="Voice & Tone">
              <p className="text-sm leading-relaxed">{brand.voice_summary}</p>
            </Section>
          )}

          {/* References */}
          {task.references.length > 0 && (
            <Section label="References">
              <div className="space-y-2">
                {task.references.map((ref) => (
                  <div key={ref.id} className="flex items-center gap-3 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-3">
                    <span className="text-xs font-mono uppercase text-[var(--gray)] w-20 shrink-0">{ref.ref_type}</span>
                    {ref.url ? (
                      <a href={ref.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-[var(--cobalt)] underline underline-offset-2 truncate">
                        {ref.caption ?? ref.url}
                      </a>
                    ) : (
                      <span className="text-sm text-[var(--gray)]">{ref.caption ?? 'No link'}</span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {task.references.length === 0 && (
            <Section label="References">
              <p className="text-sm text-[var(--gray)]">No references attached. Team lead can add them via the task.</p>
            </Section>
          )}

          {/* Notes */}
          {task.notes && (
            <Section label="Notes from lead">
              <p className="text-sm leading-relaxed">{task.notes}</p>
            </Section>
          )}

          {/* Dates */}
          {((task as any).start_date || (task as any).deadline) && (
            <Section label="Timeline">
              <div className="flex gap-6">
                {(task as any).start_date && (
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--gray)] mb-1">Start</p>
                    <p className="text-sm font-mono">{new Date((task as any).start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                {(task as any).deadline && (
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--gray)] mb-1">Deadline</p>
                    <p className="text-sm font-mono">{new Date((task as any).deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Reviewer */}
          {task.reviewer && (
            <Section label="Reviewer">
              <p className="text-sm">{task.reviewer.name}</p>
            </Section>
          )}

          {/* Revision history */}
          {revisionRound > 0 && (
            <Section label={`Revision Round ${revisionRound}`}>
              <p className="text-sm text-[var(--gray)]">This task has been through {revisionRound} revision round{revisionRound !== 1 ? 's' : ''}.</p>
            </Section>
          )}

          {/* Submission URL — always visible */}
          <Section label="Submission URL">
            <div className="flex gap-2 items-center">
              <input
                value={submissionLink}
                onChange={e => setSubmissionLink(e.target.value)}
                placeholder="Figma, Drive, Notion, any link..."
                style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', padding: '9px 14px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={saveSubmissionLink}
                disabled={savingLink || !submissionLink.trim()}
                style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '9px 18px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: savingLink || !submissionLink.trim() ? 'not-allowed' : 'pointer', opacity: savingLink || !submissionLink.trim() ? 0.4 : 1, whiteSpace: 'nowrap' }}
              >
                {savingLink ? '…' : 'Save'}
              </button>
            </div>
            {submissionLink && (
              <a href={submissionLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--cobalt)] underline underline-offset-2 mt-2 block truncate">
                {submissionLink}
              </a>
            )}
          </Section>
        </div>

        {/* Rework notes input */}
        {showReworkInput && (
          <div style={{ padding: '0 32px 16px', display: 'flex', gap: '8px' }}>
            <input
              value={reworkNotes}
              onChange={e => setReworkNotes(e.target.value)}
              placeholder="What needs to change? (required)"
              style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--red)', borderRadius: '999px', padding: '10px 16px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>

          {/* Acknowledge button — shown to owner if not yet acknowledged */}
          {!acknowledged && currentUserId === task.owner_id && task.status === 'scheduled' && (
            <button
              onClick={acknowledge}
              disabled={loading}
              style={{ flex: 1, background: 'var(--paper)', color: 'var(--ink)', padding: '12px 16px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '…' : '👀 Acknowledge'}
            </button>
          )}
          {acknowledged && task.status === 'scheduled' && (
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray)', padding: '12px 0' }}>
              ✓ Acknowledged
            </div>
          )}

          {isReviewer && task.status === 'ready_for_review' ? (
            <>
              <button
                onClick={approve}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'var(--coral)',
                  color: 'var(--ink)',
                  padding: '12px 16px',
                  borderRadius: '999px',
                  border: '1px solid var(--ink)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {loading ? '…' : '✓ Approve'}
              </button>
              <button
                onClick={requestRework}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'var(--red)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '999px',
                  border: '1px solid var(--red)',
                  fontFamily: 'var(--f-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {loading ? '…' : '↺ Rework'}
              </button>
            </>
          ) : done ? (
            <div style={{
              flex: 1,
              background: 'var(--coral)',
              border: '1px solid var(--ink)',
              color: 'var(--ink)',
              textAlign: 'center',
              padding: '12px 16px',
              borderRadius: '999px',
              fontFamily: 'var(--f-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              ✓ Awaiting review
            </div>
          ) : (
            <button
              onClick={markDone}
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
                transition: 'all 0.2s',
              }}
            >
              {loading ? '…' : '✓ Mark done'}
            </button>
          )}
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
              transition: 'all 0.2s',
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-2">{label}</p>
      {children}
    </div>
  );
}
