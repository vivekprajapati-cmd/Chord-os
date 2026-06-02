'use client';

import { useState } from 'react';
import type { MOCK_BLOCKS } from '@/lib/mock-data';

type Block = typeof MOCK_BLOCKS[number];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-2">{label}</p>
      {children}
    </div>
  );
}

export default function DemoContextModal({ block, onClose }: { block: Block; onClose: () => void }) {
  const [done, setDone] = useState(block.status === 'done' || block.status === 'ready_for_review');
  const [acknowledged, setAcknowledged] = useState(false);
  const [revisionRound, setRevisionRound] = useState(0);
  const [submissionLink, setSubmissionLink] = useState('');
  const [showSubmitInput, setShowSubmitInput] = useState(false);
  const [reworkNotes, setReworkNotes] = useState('');
  const [showReworkInput, setShowReworkInput] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approved, setApproved] = useState(false);
  const task = block.tasks;
  const brand = task.brands;
  const colors = brand.colors ?? {};

  function handleMarkDone() {
    if (!submissionLink.trim()) { setShowSubmitInput(true); return; }
    setDone(true);
    setShowSubmitInput(false);
  }

  function handleRequestRework() {
    if (!reworkNotes.trim()) { setShowReworkInput(true); return; }
    const newRound = revisionRound + 1;
    setRevisionRound(newRound);
    setDone(false);
    setReworkNotes('');
    setShowReworkInput(false);
    setSubmissionLink('');
    if (newRound >= 3) alert(`🚩 Round ${newRound} — Slack notified. Escalate to manager.`);
  }

  const btnBase = { padding: '12px 16px', borderRadius: '999px' as const, fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--ink)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '600px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '12px 12px 0 var(--ink)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

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
              {revisionRound > 0 && <><span>·</span><span style={{ color: 'var(--red)' }}>Round {revisionRound}</span></>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', color: 'var(--gray)', cursor: 'pointer', padding: 0, marginLeft: '16px' }}>×</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {Object.keys(colors).length > 0 && (
            <Section label="Brand Colors">
              <div className="flex gap-3 flex-wrap">
                {Object.entries(colors).map(([name, hex]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-[var(--line)]" style={{ background: hex }} />
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

          {task.references.length > 0 && (
            <Section label="References">
              <div className="space-y-2">
                {task.references.map((ref) => (
                  <div key={ref.id} className="flex items-center gap-3 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-3">
                    <span className="text-xs font-mono uppercase text-[var(--gray)] w-20 shrink-0">{ref.ref_type}</span>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--cobalt)] underline underline-offset-2 truncate">
                      {ref.caption ?? ref.url}
                    </a>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {task.notes && (
            <Section label="Notes from lead">
              <p className="text-sm leading-relaxed">{task.notes}</p>
            </Section>
          )}

          {task.reviewer && (
            <Section label="Reviewer">
              <p className="text-sm">{task.reviewer.name}</p>
            </Section>
          )}

          {submissionLink && done && (
            <Section label="Submitted Work">
              <a href={submissionLink} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--cobalt)] underline underline-offset-2 break-all">
                {submissionLink}
              </a>
            </Section>
          )}

          {revisionRound > 0 && (
            <Section label={`Revision History`}>
              <p className="text-sm text-[var(--gray)]">{revisionRound} revision round{revisionRound !== 1 ? 's' : ''} completed.</p>
            </Section>
          )}
        </div>

        {/* Submission link input */}
        {showSubmitInput && (
          <div style={{ padding: '0 32px 12px', display: 'flex', gap: '8px' }}>
            <input
              value={submissionLink}
              onChange={e => setSubmissionLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMarkDone()}
              placeholder="Paste Google Drive / Figma / any URL"
              style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 16px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        )}

        {/* Rework notes input */}
        {showReworkInput && (
          <div style={{ padding: '0 32px 12px', display: 'flex', gap: '8px' }}>
            <input
              value={reworkNotes}
              onChange={e => setReworkNotes(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRequestRework()}
              placeholder="What needs to change? (required)"
              style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--red)', borderRadius: '999px', padding: '10px 16px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

          {/* Acknowledge */}
          {!acknowledged && !done && (
            <button onClick={() => setAcknowledged(true)} style={{ ...btnBase, flex: 1, background: 'var(--paper)', color: 'var(--ink)' }}>
              👀 Acknowledge
            </button>
          )}
          {acknowledged && !done && (
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray)', padding: '12px 0' }}>
              ✓ Acknowledged
            </div>
          )}

          {/* Mark done / awaiting / approve+rework */}
          {approved ? (
            <div style={{ ...btnBase, flex: 1, background: 'var(--yellow)', color: 'var(--ink)', textAlign: 'center', cursor: 'default' }}>✓ Approved</div>
          ) : done ? (
            <>
              <div style={{ ...btnBase, flex: 1, background: 'var(--yellow)', color: 'var(--ink)', textAlign: 'center', cursor: 'default' }}>✓ Awaiting review</div>
              <button onClick={() => { setApproved(true); }} style={{ ...btnBase, background: 'var(--yellow)', color: 'var(--ink)' }}>✓ Approve</button>
              <button onClick={handleRequestRework} style={{ ...btnBase, background: 'var(--red)', color: '#fff', border: '1px solid var(--red)' }}>↺ Rework</button>
            </>
          ) : (
            <button onClick={handleMarkDone} style={{ ...btnBase, flex: 1, background: 'var(--ink)', color: 'var(--cream)' }}>
              ✓ Mark done
            </button>
          )}

          <button onClick={onClose} style={{ ...btnBase, background: 'transparent', color: 'var(--ink)' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
