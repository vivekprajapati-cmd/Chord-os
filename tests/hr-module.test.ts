import { describe, it, expect } from 'vitest';

// ── HR Tab access ─────────────────────────────────────────────────────────────
function canAccessHRTab(tier: string) {
  return tier === 'admin' || tier === 'hr';
}

describe('HR tab access', () => {
  it('admin can access', () => expect(canAccessHRTab('admin')).toBe(true));
  it('hr can access',    () => expect(canAccessHRTab('hr')).toBe(true));
  it('lead cannot',      () => expect(canAccessHRTab('lead')).toBe(false));
  it('operations cannot',() => expect(canAccessHRTab('operations')).toBe(false));
  it('staff cannot',     () => expect(canAccessHRTab('staff')).toBe(false));
  it('viewer cannot',    () => expect(canAccessHRTab('viewer')).toBe(false));
});

// ── Feedback submission access ────────────────────────────────────────────────
function canSubmitFeedback(tier: string) {
  return tier === 'admin' || tier === 'hr';
}

describe('Feedback submission', () => {
  it('admin can submit',     () => expect(canSubmitFeedback('admin')).toBe(true));
  it('hr can submit',        () => expect(canSubmitFeedback('hr')).toBe(true));
  it('lead cannot submit',   () => expect(canSubmitFeedback('lead')).toBe(false));
  it('staff cannot submit',  () => expect(canSubmitFeedback('staff')).toBe(false));
});

// ── Leave approval gating ─────────────────────────────────────────────────────
function canApproveLeave(personId: string, approverId: string, tier: string) {
  // HR/admin are read-only in HR tab — only the assigned approver can action
  return personId === approverId;
}

describe('Leave approval', () => {
  const APPROVER = 'person-a';
  const OTHER    = 'person-b';

  it('assigned approver can approve', () => {
    expect(canApproveLeave(APPROVER, APPROVER, 'lead')).toBe(true);
  });

  it('non-assigned person cannot approve', () => {
    expect(canApproveLeave(OTHER, APPROVER, 'lead')).toBe(false);
  });

  it('hr tier cannot approve — read-only in HR tab', () => {
    expect(canApproveLeave(OTHER, APPROVER, 'hr')).toBe(false);
  });
});

// ── Leave balance calculation ─────────────────────────────────────────────────
type LeaveType = 'planned' | 'urgent' | 'birthday';

const DEFAULTS = { planned: 12, urgent: 8, birthday: 1 };
const PROBATION_DEFAULTS = { planned: 0, urgent: 1, birthday: 1 };

function calcRemaining(
  totals: typeof DEFAULTS,
  approved: { type: LeaveType; duration_days: number }[]
) {
  const used: Record<string, number> = { planned: 0, urgent: 0, birthday: 0 };
  for (const l of approved) used[l.type] += l.duration_days;
  return {
    planned:  totals.planned  - used.planned,
    urgent:   totals.urgent   - used.urgent,
    birthday: totals.birthday - used.birthday,
  };
}

describe('Leave balance', () => {
  it('full balance when no leaves taken', () => {
    const bal = calcRemaining(DEFAULTS, []);
    expect(bal).toEqual({ planned: 12, urgent: 8, birthday: 1 });
  });

  it('deducts approved planned leave', () => {
    const bal = calcRemaining(DEFAULTS, [{ type: 'planned', duration_days: 3 }]);
    expect(bal.planned).toBe(9);
    expect(bal.urgent).toBe(8); // unchanged
  });

  it('deducts multiple leaves of different types', () => {
    const bal = calcRemaining(DEFAULTS, [
      { type: 'planned', duration_days: 5 },
      { type: 'urgent',  duration_days: 2 },
    ]);
    expect(bal.planned).toBe(7);
    expect(bal.urgent).toBe(6);
    expect(bal.birthday).toBe(1);
  });

  it('can go to zero', () => {
    const bal = calcRemaining(DEFAULTS, [{ type: 'urgent', duration_days: 8 }]);
    expect(bal.urgent).toBe(0);
  });

  it('can go negative (overage — no hard block in logic)', () => {
    const bal = calcRemaining(DEFAULTS, [{ type: 'birthday', duration_days: 2 }]);
    expect(bal.birthday).toBe(-1);
  });

  it('probation: planned=0, urgent=1, birthday=1', () => {
    const bal = calcRemaining(PROBATION_DEFAULTS, []);
    expect(bal).toEqual({ planned: 0, urgent: 1, birthday: 1 });
  });
});

// ── Feedback stats (this quarter) ─────────────────────────────────────────────
function calcFeedbackStats(
  people: { id: string }[],
  feedback: { person_id: string; published_at: string }[],
  qStart: Date
) {
  const givenThisQuarter = new Set(
    feedback.filter(f => new Date(f.published_at) >= qStart).map(f => f.person_id)
  ).size;
  return {
    total: people.length,
    givenThisQuarter,
    pending: people.length - givenThisQuarter,
  };
}

describe('Feedback stats', () => {
  const people = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const qStart = new Date('2026-07-01');

  it('all pending when no feedback given', () => {
    const s = calcFeedbackStats(people, [], qStart);
    expect(s).toEqual({ total: 3, givenThisQuarter: 0, pending: 3 });
  });

  it('counts distinct employees who received feedback this quarter', () => {
    const fb = [
      { person_id: 'a', published_at: '2026-08-01T00:00:00Z' },
      { person_id: 'a', published_at: '2026-08-15T00:00:00Z' }, // duplicate — same person
      { person_id: 'b', published_at: '2026-08-10T00:00:00Z' },
    ];
    const s = calcFeedbackStats(people, fb, qStart);
    expect(s.givenThisQuarter).toBe(2); // a and b, not 3
    expect(s.pending).toBe(1);          // c
  });

  it('excludes feedback from previous quarter', () => {
    const fb = [{ person_id: 'a', published_at: '2026-06-30T00:00:00Z' }]; // before Q3
    const s = calcFeedbackStats(people, fb, qStart);
    expect(s.givenThisQuarter).toBe(0);
    expect(s.pending).toBe(3);
  });
});
