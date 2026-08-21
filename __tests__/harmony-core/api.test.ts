/**
 * Integration tests for harmony-core API routes.
 * These mock Supabase and Next.js server utilities — no real DB required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- shared mock factories ---

function makeUser(overrides: any = {}) {
  return { id: 'user-1', email: 'test@chord.com', ...overrides };
}

function makeSupabase(overrides: {
  user?: any;
  me?: any;
  authError?: any;
} = {}) {
  const user = overrides.user ?? makeUser();
  const authError = overrides.authError ?? null;
  const me = overrides.me ?? { access_tier: 'admin' };

  const chain = (result: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null }),
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: authError ? null : user }, error: authError }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'people') return { ...chain(me), select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: me, error: null }) };
      return chain(null);
    }),
  };
}

// --- /api/harmony-core GET ---

describe('GET /api/harmony-core', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ authError: new Error('no session') }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { GET } = await import('../../app/api/harmony-core/route');
    const req = new Request('http://localhost/api/harmony-core?person_id=p1&month=2026-08-01');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when missing params', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { GET } = await import('../../app/api/harmony-core/route');
    const req = new Request('http://localhost/api/harmony-core');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns assignments and entries on valid request', async () => {
    const fakeRpcAssignments = [{ brand_id: 'b1', role_type: 'social', brand_name: 'Brand A' }];
    const fakeEntries = [{ brand_id: 'b1', metrics: { scope: 10 } }];

    const adminChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    const adminClient = {
      rpc: vi.fn().mockResolvedValue({ data: fakeRpcAssignments, error: null }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'harmony_core_monthly') {
          return { ...adminChain, then: (fn: any) => Promise.resolve({ data: fakeEntries, error: null }).then(fn) };
        }
        return adminChain;
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { GET } = await import('../../app/api/harmony-core/route');
    const req = new Request('http://localhost/api/harmony-core?person_id=p1&month=2026-08-01');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('assignments');
    expect(body).toHaveProperty('entries');
  });
});

// --- /api/harmony-core POST ---

describe('POST /api/harmony-core', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ authError: new Error('no session') }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { POST } = await import('../../app/api/harmony-core/route');
    const req = new Request('http://localhost/api/harmony-core', { method: 'POST', body: JSON.stringify({ person_id: 'p1', brand_id: 'b1', month: '2026-08-01', role_type: 'social', metrics: {}, tracker_logs: {} }) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-admin writes for another person', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { id: 'user-99', access_tier: 'staff' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { POST } = await import('../../app/api/harmony-core/route');
    const req = new Request('http://localhost/api/harmony-core', {
      method: 'POST',
      body: JSON.stringify({ person_id: 'other-person', brand_id: 'b1', month: '2026-08-01', role_type: 'social', metrics: {}, tracker_logs: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

// --- /api/harmony-core/assignments GET ---

describe('GET /api/harmony-core/assignments', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ authError: new Error() }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { GET } = await import('../../app/api/harmony-core/assignments/route');
    const req = new Request('http://localhost/api/harmony-core/assignments');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns brands and people lists', async () => {
    const brands = [{ id: 'b1', name: 'Brand A' }];
    const people = [{ id: 'p1', name: 'Atharva' }];

    const adminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        const data = table === 'brands' ? brands : people;
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data, error: null }),
        };
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { GET } = await import('../../app/api/harmony-core/assignments/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('brands');
    expect(body).toHaveProperty('people');
  });
});

// --- /api/harmony-core/assignments POST ---

describe('POST /api/harmony-core/assignments', () => {
  beforeEach(() => vi.resetModules());

  it('returns 403 for non-admin', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { access_tier: 'staff' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { POST } = await import('../../app/api/harmony-core/assignments/route');
    const req = new Request('http://localhost/api/harmony-core/assignments', {
      method: 'POST',
      body: JSON.stringify({ person_id: 'p1', brand_id: 'b1', role_type: 'social', action: 'assign' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when missing person_id or brand_id', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { access_tier: 'admin' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => makeSupabase() }));

    const { POST } = await import('../../app/api/harmony-core/assignments/route');
    const req = new Request('http://localhost/api/harmony-core/assignments', {
      method: 'POST',
      body: JSON.stringify({ action: 'assign' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('calls upsert on assign action', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    const adminClient = {
      from: vi.fn().mockReturnValue({
        upsert: upsertFn,
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { access_tier: 'admin' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { POST } = await import('../../app/api/harmony-core/assignments/route');
    const req = new Request('http://localhost/api/harmony-core/assignments', {
      method: 'POST',
      body: JSON.stringify({ person_id: 'p1', brand_id: 'b1', role_type: 'social', action: 'assign' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertFn).toHaveBeenCalledWith(
      { person_id: 'p1', brand_id: 'b1', role_type: 'social' },
      { onConflict: 'person_id,brand_id' }
    );
  });

  it('calls delete on unassign action', async () => {
    const deleteFn = vi.fn().mockReturnThis();
    const eqFn = vi.fn().mockReturnThis();
    const adminClient = {
      from: vi.fn().mockReturnValue({
        delete: deleteFn,
        eq: eqFn,
        upsert: vi.fn().mockReturnThis(),
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { access_tier: 'admin' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { POST } = await import('../../app/api/harmony-core/assignments/route');
    const req = new Request('http://localhost/api/harmony-core/assignments', {
      method: 'POST',
      body: JSON.stringify({ person_id: 'p1', brand_id: 'b1', role_type: 'social', action: 'unassign' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(deleteFn).toHaveBeenCalled();
  });
});
