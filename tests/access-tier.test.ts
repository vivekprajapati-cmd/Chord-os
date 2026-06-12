import { describe, it, expect } from 'vitest';

// Replicates tier resolution logic used across page.tsx files
function resolvePermissions(tier: string, viewAll: boolean) {
  const isAdmin = tier === 'admin' || tier === 'operations';
  const isLead = tier === 'lead';
  const isStaff = tier === 'staff';
  const isViewer = tier === 'viewer';
  const canSeeAllTasks = isAdmin || viewAll;
  const canEdit = isAdmin || isLead;
  const canCreate = true; // all tiers
  const ownTasksOnly = isStaff && !viewAll;

  return { isAdmin, isLead, isStaff, isViewer, canSeeAllTasks, canEdit, canCreate, ownTasksOnly };
}

describe('Access tier — admin', () => {
  it('can see all tasks', () => {
    const p = resolvePermissions('admin', false);
    expect(p.canSeeAllTasks).toBe(true);
  });

  it('can edit tasks', () => {
    expect(resolvePermissions('admin', false).canEdit).toBe(true);
  });
});

describe('Access tier — operations', () => {
  it('treated as admin — can see all tasks', () => {
    expect(resolvePermissions('operations', false).isAdmin).toBe(true);
    expect(resolvePermissions('operations', false).canSeeAllTasks).toBe(true);
  });

  it('can edit tasks (treated same as admin)', () => {
    expect(resolvePermissions('operations', false).canEdit).toBe(true);
  });
});

describe('Access tier — lead', () => {
  it('can edit tasks', () => {
    expect(resolvePermissions('lead', false).canEdit).toBe(true);
  });

  it('is not treated as admin', () => {
    expect(resolvePermissions('lead', false).isAdmin).toBe(false);
  });
});

describe('Access tier — staff', () => {
  it('sees own tasks only', () => {
    expect(resolvePermissions('staff', false).ownTasksOnly).toBe(true);
  });

  it('cannot edit tasks', () => {
    expect(resolvePermissions('staff', false).canEdit).toBe(false);
  });

  it('can create tasks', () => {
    expect(resolvePermissions('staff', false).canCreate).toBe(true);
  });

  it('with viewAll flag — can see all tasks', () => {
    expect(resolvePermissions('staff', true).canSeeAllTasks).toBe(true);
    expect(resolvePermissions('staff', true).ownTasksOnly).toBe(false);
  });
});

describe('Access tier — viewer', () => {
  it('is not admin, not lead, not staff', () => {
    const p = resolvePermissions('viewer', false);
    expect(p.isAdmin).toBe(false);
    expect(p.isLead).toBe(false);
    expect(p.isStaff).toBe(false);
    expect(p.isViewer).toBe(true);
  });

  it('cannot edit tasks', () => {
    expect(resolvePermissions('viewer', false).canEdit).toBe(false);
  });
});
