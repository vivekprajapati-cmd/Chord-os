import { describe, it, expect } from 'vitest';

// ── Logic replicated from components/brand-ops-docs.tsx ──────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

function monthLabel(m: string) {
  const [year, month] = m.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

function timeAgo(dateStr: string, nowMs: number): string {
  const diff = nowMs - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// ── Logic replicated from app/api/ops-docs/route.ts ──────────────────────────

const CAN_MANAGE = ['admin', 'lead', 'operations'];

function canManageDocs(tier: string): boolean {
  return CAN_MANAGE.includes(tier);
}

// Storage path construction (same pattern as upload handler)
function buildFilePath(brandSlug: string, docType: string, month: string, timestamp: number, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${brandSlug}/${docType}/${month}/${timestamp}_${safeName}`;
}

// Filter logic replicated from the filtered array in BrandOpsDocs component
type DocFilter = {
  brand_id?: string;
  doc_type?: string;
  month?: string;
  week?: number;
};

type Doc = {
  id: string;
  brand_id: string;
  doc_type: string;
  month: string;
  week: number;
  link: string | null;
  file_path: string | null;
};

function filterDocs(docs: Doc[], f: DocFilter): Doc[] {
  return docs.filter(d => {
    if (f.brand_id && d.brand_id !== f.brand_id) return false;
    if (f.doc_type && d.doc_type !== f.doc_type) return false;
    if (f.month && d.month !== f.month) return false;
    if (f.week && d.week !== f.week) return false;
    return true;
  });
}

// ── monthLabel ────────────────────────────────────────────────────────────────

describe('monthLabel', () => {
  it('formats YYYY-MM to Month Year', () => {
    expect(monthLabel('2026-06')).toBe('June 2026');
  });

  it('handles January', () => {
    expect(monthLabel('2025-01')).toBe('January 2025');
  });

  it('handles December', () => {
    expect(monthLabel('2035-12')).toBe('December 2035');
  });

  it('handles single-digit month with leading zero', () => {
    expect(monthLabel('2026-03')).toBe('March 2026');
  });
});

// ── YEARS range ───────────────────────────────────────────────────────────────

describe('YEARS range', () => {
  it('starts at 2025', () => {
    expect(YEARS[0]).toBe(2025);
  });

  it('ends at 2035', () => {
    expect(YEARS[YEARS.length - 1]).toBe(2035);
  });

  it('has 11 entries', () => {
    expect(YEARS.length).toBe(11);
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  const now = new Date('2026-06-15T10:00:00Z').getTime();

  it('returns "Today" for same day', () => {
    expect(timeAgo('2026-06-15T05:00:00Z', now)).toBe('Today');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    expect(timeAgo('2026-06-14T10:00:00Z', now)).toBe('Yesterday');
  });

  it('returns "N days ago" for older dates', () => {
    expect(timeAgo('2026-06-10T10:00:00Z', now)).toBe('5 days ago');
  });

  it('returns "30 days ago" for a month ago', () => {
    expect(timeAgo('2026-05-16T10:00:00Z', now)).toBe('30 days ago');
  });
});

// ── canManageDocs ─────────────────────────────────────────────────────────────

describe('canManageDocs', () => {
  it('admin can manage', () => {
    expect(canManageDocs('admin')).toBe(true);
  });

  it('lead can manage', () => {
    expect(canManageDocs('lead')).toBe(true);
  });

  it('operations can manage', () => {
    expect(canManageDocs('operations')).toBe(true);
  });

  it('staff cannot manage', () => {
    expect(canManageDocs('staff')).toBe(false);
  });

  it('viewer cannot manage', () => {
    expect(canManageDocs('viewer')).toBe(false);
  });
});

// ── buildFilePath ─────────────────────────────────────────────────────────────

describe('buildFilePath', () => {
  it('builds correct storage path', () => {
    const path = buildFilePath('nike', 'orm_report', '2026-06', 1718000000000, 'report.pdf');
    expect(path).toBe('nike/orm_report/2026-06/1718000000000_report.pdf');
  });

  it('sanitises special characters in filename', () => {
    const path = buildFilePath('brand-x', 'review_deck', '2026-05', 100, 'My Report (Final).pdf');
    expect(path).toContain('100_My_Report__Final_.pdf');
  });

  it('preserves allowed filename characters', () => {
    const path = buildFilePath('slug', 'weekly_tracker', '2026-01', 1, 'tracker-v2.xlsx');
    expect(path).toContain('tracker-v2.xlsx');
  });

  it('includes brand slug as root folder', () => {
    const path = buildFilePath('lenskart', 'orm_report', '2026-06', 1, 'f.pdf');
    expect(path.startsWith('lenskart/')).toBe(true);
  });

  it('includes doc type as subfolder', () => {
    const path = buildFilePath('slug', 'review_deck', '2026-06', 1, 'f.pdf');
    expect(path).toContain('/review_deck/');
  });

  it('includes month as subfolder', () => {
    const path = buildFilePath('slug', 'orm_report', '2026-06', 1, 'f.pdf');
    expect(path).toContain('/2026-06/');
  });
});

// ── filterDocs ────────────────────────────────────────────────────────────────

const SAMPLE_DOCS: Doc[] = [
  { id: '1', brand_id: 'b1', doc_type: 'orm_report',     month: '2026-06', week: 1, link: null,        file_path: 'a.pdf' },
  { id: '2', brand_id: 'b1', doc_type: 'review_deck',    month: '2026-06', week: 2, link: 'https://x', file_path: null },
  { id: '3', brand_id: 'b2', doc_type: 'weekly_tracker', month: '2026-05', week: 1, link: null,        file_path: 'b.pdf' },
  { id: '4', brand_id: 'b2', doc_type: 'orm_report',     month: '2026-06', week: 3, link: 'https://y', file_path: null },
];

describe('filterDocs', () => {
  it('returns all docs with no filters', () => {
    expect(filterDocs(SAMPLE_DOCS, {})).toHaveLength(4);
  });

  it('filters by brand_id', () => {
    const result = filterDocs(SAMPLE_DOCS, { brand_id: 'b1' });
    expect(result).toHaveLength(2);
    expect(result.every(d => d.brand_id === 'b1')).toBe(true);
  });

  it('filters by doc_type', () => {
    const result = filterDocs(SAMPLE_DOCS, { doc_type: 'orm_report' });
    expect(result).toHaveLength(2);
    expect(result.every(d => d.doc_type === 'orm_report')).toBe(true);
  });

  it('filters by month', () => {
    const result = filterDocs(SAMPLE_DOCS, { month: '2026-05' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('filters by week', () => {
    const result = filterDocs(SAMPLE_DOCS, { week: 1 });
    expect(result).toHaveLength(2);
  });

  it('combines brand + doc_type filters', () => {
    const result = filterDocs(SAMPLE_DOCS, { brand_id: 'b2', doc_type: 'orm_report' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('combines month + week filters', () => {
    const result = filterDocs(SAMPLE_DOCS, { month: '2026-06', week: 2 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty array when no match', () => {
    expect(filterDocs(SAMPLE_DOCS, { brand_id: 'b99' })).toHaveLength(0);
  });
});

// ── POST validation (mirrors API guard logic) ─────────────────────────────────

function validateOpsDocPayload(body: {
  brand_id?: string;
  doc_type?: string;
  month?: string;
  week?: number;
  link?: string;
  file_path?: string;
}): { ok: boolean; error?: string } {
  if (!body.brand_id || !body.doc_type || !body.month || !body.week) {
    return { ok: false, error: 'Missing required fields' };
  }
  if (!body.link && !body.file_path) {
    return { ok: false, error: 'Provide a link or file' };
  }
  return { ok: true };
}

describe('validateOpsDocPayload', () => {
  it('accepts valid payload with link', () => {
    expect(validateOpsDocPayload({ brand_id: 'b1', doc_type: 'orm_report', month: '2026-06', week: 1, link: 'https://x' }).ok).toBe(true);
  });

  it('accepts valid payload with file_path', () => {
    expect(validateOpsDocPayload({ brand_id: 'b1', doc_type: 'orm_report', month: '2026-06', week: 1, file_path: 'a/b.pdf' }).ok).toBe(true);
  });

  it('rejects when brand_id missing', () => {
    const r = validateOpsDocPayload({ doc_type: 'orm_report', month: '2026-06', week: 1, link: 'https://x' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Missing required fields');
  });

  it('rejects when month missing', () => {
    const r = validateOpsDocPayload({ brand_id: 'b1', doc_type: 'orm_report', week: 1, link: 'https://x' });
    expect(r.ok).toBe(false);
  });

  it('rejects when week missing', () => {
    const r = validateOpsDocPayload({ brand_id: 'b1', doc_type: 'orm_report', month: '2026-06', link: 'https://x' });
    expect(r.ok).toBe(false);
  });

  it('rejects when neither link nor file_path provided', () => {
    const r = validateOpsDocPayload({ brand_id: 'b1', doc_type: 'orm_report', month: '2026-06', week: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Provide a link or file');
  });
});
