import { describe, it, expect } from 'vitest';

// ── Logic replicated from components/task-detail-modal.tsx ───────────────────

type ActivityEntry = {
  id: string;
  action: string;
  details: Record<string, string> | null;
  created_at: string;
};

type RevisionEntry = {
  id: string;
  round: number;
  feedback_notes: string | null;
  reviewed_by_id: string | null;
  created_at: string;
};

function getActivityLabel(entry: ActivityEntry): { label: string; sub: string } {
  const d = entry.details ?? {};
  let label = '';
  let sub = '';

  if (entry.action === 'task_created') {
    label = 'Task created';
    if (d.by) sub = `by ${d.by}`;
  } else if (entry.action === 'task_reassigned') {
    label = 'Reassigned';
    if (d.from && d.to) sub = `${d.from} → ${d.to}`;
    if (d.by) sub += ` (by ${d.by})`;
  } else {
    label = entry.action.replace(/_/g, ' ');
  }

  return { label, sub };
}

function findMatchingRevision(entry: ActivityEntry, revisions: RevisionEntry[]): RevisionEntry | undefined {
  if (entry.action === 'task_reassigned') return undefined;
  return revisions.find(r => {
    const rDate = new Date(r.created_at).getTime();
    const eDate = new Date(entry.created_at).getTime();
    return Math.abs(rDate - eDate) < 5000;
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getActivityLabel', () => {
  it('labels task_created with no details', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_created', details: null, created_at: '' };
    const { label, sub } = getActivityLabel(entry);
    expect(label).toBe('Task created');
    expect(sub).toBe('');
  });

  it('labels task_created with by field', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_created', details: { by: 'Vivek' }, created_at: '' };
    const { label, sub } = getActivityLabel(entry);
    expect(label).toBe('Task created');
    expect(sub).toBe('by Vivek');
  });

  it('labels task_reassigned with from and to', () => {
    const entry: ActivityEntry = {
      id: '2', action: 'task_reassigned',
      details: { from: 'Yashika', to: 'Trupti', by: 'Vivek' },
      created_at: '',
    };
    const { label, sub } = getActivityLabel(entry);
    expect(label).toBe('Reassigned');
    expect(sub).toBe('Yashika → Trupti (by Vivek)');
  });

  it('labels task_reassigned with from and to but no by', () => {
    const entry: ActivityEntry = {
      id: '3', action: 'task_reassigned',
      details: { from: 'A', to: 'B' },
      created_at: '',
    };
    const { label, sub } = getActivityLabel(entry);
    expect(sub).toBe('A → B');
  });

  it('labels task_reassigned with missing from/to', () => {
    const entry: ActivityEntry = { id: '4', action: 'task_reassigned', details: {}, created_at: '' };
    const { label, sub } = getActivityLabel(entry);
    expect(label).toBe('Reassigned');
    expect(sub).toBe('');
  });

  it('converts unknown action underscores to spaces', () => {
    const entry: ActivityEntry = { id: '5', action: 'status_changed', details: null, created_at: '' };
    const { label } = getActivityLabel(entry);
    expect(label).toBe('status changed');
  });
});

describe('findMatchingRevision', () => {
  const base = '2025-06-01T10:00:00.000Z';

  it('matches revision within 5 seconds of entry timestamp', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_reviewed', details: null, created_at: base };
    const revisions: RevisionEntry[] = [
      { id: 'r1', round: 1, feedback_notes: 'Fix the colors', reviewed_by_id: null, created_at: '2025-06-01T10:00:03.000Z' },
    ];
    const match = findMatchingRevision(entry, revisions);
    expect(match).toBeDefined();
    expect(match?.feedback_notes).toBe('Fix the colors');
  });

  it('does not match revision beyond 5 seconds', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_reviewed', details: null, created_at: base };
    const revisions: RevisionEntry[] = [
      { id: 'r1', round: 1, feedback_notes: 'Old feedback', reviewed_by_id: null, created_at: '2025-06-01T10:00:06.000Z' },
    ];
    const match = findMatchingRevision(entry, revisions);
    expect(match).toBeUndefined();
  });

  it('never matches for task_reassigned action', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_reassigned', details: {}, created_at: base };
    const revisions: RevisionEntry[] = [
      { id: 'r1', round: 1, feedback_notes: 'Should not match', reviewed_by_id: null, created_at: base },
    ];
    const match = findMatchingRevision(entry, revisions);
    expect(match).toBeUndefined();
  });

  it('returns undefined when revisions list is empty', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_created', details: null, created_at: base };
    expect(findMatchingRevision(entry, [])).toBeUndefined();
  });

  it('matches first revision when multiple are within window', () => {
    const entry: ActivityEntry = { id: '1', action: 'task_reviewed', details: null, created_at: base };
    const revisions: RevisionEntry[] = [
      { id: 'r1', round: 1, feedback_notes: 'First', reviewed_by_id: null, created_at: '2025-06-01T10:00:01.000Z' },
      { id: 'r2', round: 2, feedback_notes: 'Second', reviewed_by_id: null, created_at: '2025-06-01T10:00:02.000Z' },
    ];
    const match = findMatchingRevision(entry, revisions);
    expect(match?.id).toBe('r1');
  });
});

describe('revision count', () => {
  it('counts total revisions correctly', () => {
    const revisions: RevisionEntry[] = [
      { id: 'r1', round: 1, feedback_notes: 'Round 1 feedback', reviewed_by_id: null, created_at: '' },
      { id: 'r2', round: 2, feedback_notes: 'Round 2 feedback', reviewed_by_id: null, created_at: '' },
    ];
    expect(revisions.length).toBe(2);
  });

  it('pluralises revision label correctly', () => {
    const count = 1;
    const label = `${count} revision${count !== 1 ? 's' : ''} total`;
    expect(label).toBe('1 revision total');

    const count2 = 3;
    const label2 = `${count2} revision${count2 !== 1 ? 's' : ''} total`;
    expect(label2).toBe('3 revisions total');
  });
});
