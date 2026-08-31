/**
 * Tests for NPS forms API routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeUser(overrides: any = {}) {
  return { id: 'user-1', email: 'admin@chord.com', ...overrides };
}

function makeSupabase(overrides: { user?: any; me?: any; authError?: any } = {}) {
  const user = overrides.user ?? makeUser();
  const authError = overrides.authError ?? null;
  const me = overrides.me ?? { access_tier: 'admin' };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: authError ? null : user }, error: authError }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: me, error: null }),
    })),
  };
}

// --- GET /api/nps-forms ---

describe('GET /api/nps-forms', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ authError: new Error('no session') }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }));

    const { GET } = await import('../../app/api/nps-forms/route');
    const res = await GET(new Request('http://localhost/api/nps-forms?brand_id=b1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when brand_id missing', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

    const { GET } = await import('../../app/api/nps-forms/route');
    const res = await GET(new Request('http://localhost/api/nps-forms'));
    expect(res.status).toBe(400);
  });

  it('returns forms list for a brand', async () => {
    const fakeForms = [{ id: 'f1', form_id: 'abc123', quarter: 'Q3 2026', created_at: '2026-08-01' }];
    const adminClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: fakeForms, error: null }),
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { GET } = await import('../../app/api/nps-forms/route');
    const res = await GET(new Request('http://localhost/api/nps-forms?brand_id=b1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.forms).toHaveLength(1);
    expect(body.forms[0].quarter).toBe('Q3 2026');
  });
});

// --- POST /api/nps-forms ---

describe('POST /api/nps-forms', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ authError: new Error() }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

    const { POST } = await import('../../app/api/nps-forms/route');
    const res = await POST(new Request('http://localhost/api/nps-forms', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { access_tier: 'staff' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

    const { POST } = await import('../../app/api/nps-forms/route');
    const res = await POST(new Request('http://localhost/api/nps-forms', { method: 'POST', body: JSON.stringify({ brand_id: 'b1', form_url: 'https://docs.google.com/forms/d/abc123/viewform', quarter: 'Q3 2026' }) }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid form URL', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

    const { POST } = await import('../../app/api/nps-forms/route');
    const res = await POST(new Request('http://localhost/api/nps-forms', { method: 'POST', body: JSON.stringify({ brand_id: 'b1', form_url: 'not-a-form-url', quarter: 'Q3 2026' }) }));
    expect(res.status).toBe(400);
  });

  it('inserts form on valid request', async () => {
    const insertFn = vi.fn().mockReturnThis();
    const singleFn = vi.fn().mockResolvedValue({ data: { id: 'f1' }, error: null });
    const adminClient = {
      from: vi.fn().mockReturnValue({
        insert: insertFn,
        select: vi.fn().mockReturnThis(),
        single: singleFn,
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { POST } = await import('../../app/api/nps-forms/route');
    const res = await POST(new Request('http://localhost/api/nps-forms', {
      method: 'POST',
      body: JSON.stringify({ brand_id: 'b1', form_url: 'https://docs.google.com/forms/d/1FAIpQLSe_abc123/viewform', quarter: 'Q3 2026' }),
    }));
    expect(res.status).toBe(200);
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ brand_id: 'b1', quarter: 'Q3 2026' }));
  });
});

// --- DELETE /api/nps-forms ---

describe('DELETE /api/nps-forms', () => {
  beforeEach(() => vi.resetModules());

  it('returns 403 for non-admin', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ me: { access_tier: 'staff' } }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

    const { DELETE } = await import('../../app/api/nps-forms/route');
    const res = await DELETE(new Request('http://localhost/api/nps-forms?id=f1', { method: 'DELETE' }));
    expect(res.status).toBe(403);
  });

  it('deletes form for admin', async () => {
    const deleteFn = vi.fn().mockReturnThis();
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const adminClient = { from: vi.fn().mockReturnValue({ delete: deleteFn, eq: eqFn }) };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { DELETE } = await import('../../app/api/nps-forms/route');
    const res = await DELETE(new Request('http://localhost/api/nps-forms?id=f1', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(deleteFn).toHaveBeenCalled();
  });
});

// --- GET /api/nps-forms/responses ---

describe('GET /api/nps-forms/responses', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase({ authError: new Error() }) }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

    const { GET } = await import('../../app/api/nps-forms/responses/route');
    const res = await GET(new Request('http://localhost/api/nps-forms/responses?brand_id=b1'));
    expect(res.status).toBe(401);
  });

  it('returns empty when no forms exist', async () => {
    const adminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'nps_forms') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { GET } = await import('../../app/api/nps-forms/responses/route');
    const res = await GET(new Request('http://localhost/api/nps-forms/responses?brand_id=b1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.responses).toHaveLength(0);
  });

  it('returns 503 when no Google account connected', async () => {
    const adminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'nps_forms') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ id: 'f1', form_id: 'abc', quarter: 'Q3 2026' }], error: null }) };
        }
        // people table — no refresh token
        return { select: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
      }),
    };

    vi.doMock('@/lib/supabase/server', () => ({ createClient: async () => makeSupabase() }));
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminClient }));

    const { GET } = await import('../../app/api/nps-forms/responses/route');
    const res = await GET(new Request('http://localhost/api/nps-forms/responses?brand_id=b1'));
    expect(res.status).toBe(503);
  });
});

// --- extractFormId helper ---

describe('extractFormId', () => {
  it('extracts form ID from full URL', async () => {
    const { extractFormId } = await import('../../lib/google-forms');
    expect(extractFormId('https://docs.google.com/forms/d/1FAIpQLSe_abc123XYZ/viewform')).toBe('1FAIpQLSe_abc123XYZ');
  });

  it('returns bare ID as-is if valid', async () => {
    const { extractFormId } = await import('../../lib/google-forms');
    expect(extractFormId('1FAIpQLSe_abc123XYZabcdefghij')).toBe('1FAIpQLSe_abc123XYZabcdefghij');
  });

  it('returns null for invalid input', async () => {
    const { extractFormId } = await import('../../lib/google-forms');
    expect(extractFormId('not-a-form')).toBeNull();
  });
});
