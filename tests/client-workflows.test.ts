import { describe, it, expect } from 'vitest';

// ─── Replicates validation logic from app/api/client/reviews/route.ts ────────

function validateReview(body: { type?: string; message?: string }) {
  const { type, message } = body;
  if (!type || !message) return { ok: false, status: 400, error: 'type and message are required.' };
  if (!['review', 'attention'].includes(type)) return { ok: false, status: 400, error: 'type must be review or attention.' };
  if (typeof message !== 'string' || message.trim().length === 0) return { ok: false, status: 400, error: 'message cannot be empty.' };
  if (message.trim().length > 1000) return { ok: false, status: 400, error: 'message too long (max 1000 chars).' };
  return { ok: true, status: 200 };
}

// ─── Replicates section validation from app/api/client/files/route.ts ────────

const VALID_SECTIONS = ['Brand Identity', 'Finance', 'Reports', 'Contracts', 'Creatives', 'General'] as const;
type FileSection = (typeof VALID_SECTIONS)[number];

function resolveSection(input: string | null): FileSection {
  return (VALID_SECTIONS as readonly string[]).includes(input ?? '') ? (input as FileSection) : 'General';
}

// ─── Replicates row parsing from lib/google-sheets.ts ────────────────────────

type SheetTask = {
  id: string; category: string; description: string; owner: string;
  dateAligned: string; dueDate: string; status: string; ragFlag: string;
  month: string; remarks: string;
};

function parseOpenTasks(rows: string[][]): SheetTask[] {
  if (rows.length < 2) return [];
  return rows.slice(1)
    .filter(r => r[0] && r[2] && r[7]?.toLowerCase() !== 'closed')
    .map(r => ({
      id: r[0] ?? '', category: r[1] ?? '', description: r[2] ?? '',
      owner: r[3] ?? '', dateAligned: r[4] ?? '', dueDate: r[6] ?? '',
      status: r[7] ?? '', ragFlag: r[12] ?? '', month: r[13] ?? '', remarks: r[14] ?? '',
    }));
}

type MonthSummary = {
  month: string; aligned: number; closed: number; open: number;
  closureRate: number; atRisk: number; overdue: number;
};

function parseMonthlySummary(rows: string[][]): MonthSummary[] {
  if (rows.length < 2) return [];
  return rows.slice(1)
    .filter(r => r[0] && r[0].match(/\w{3}-\d{4}/))
    .map(r => ({
      month: r[0],
      aligned: parseInt(r[1]) || 0,
      closed: parseInt(r[2]) || 0,
      open: parseInt(r[3]) || 0,
      closureRate: parseFloat(r[4]?.replace('%', '')) || 0,
      atRisk: parseInt(r[5]) || 0,
      overdue: parseInt(r[6]) || 0,
    }))
    .filter(m => m.aligned > 0);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Client review validation', () => {
  it('accepts valid review', () => {
    expect(validateReview({ type: 'review', message: 'Great work this month.' })).toMatchObject({ ok: true });
  });

  it('accepts valid attention flag', () => {
    expect(validateReview({ type: 'attention', message: 'Deliverable was late.' })).toMatchObject({ ok: true });
  });

  it('rejects missing type', () => {
    const r = validateReview({ message: 'hello' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });

  it('rejects missing message', () => {
    const r = validateReview({ type: 'review' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });

  it('rejects invalid type', () => {
    const r = validateReview({ type: 'complaint', message: 'some message' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('review or attention');
  });

  it('rejects empty message string', () => {
    const r = validateReview({ type: 'review', message: '   ' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('empty');
  });

  it('rejects message over 1000 chars', () => {
    const r = validateReview({ type: 'review', message: 'a'.repeat(1001) });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('1000');
  });

  it('accepts message exactly at 1000 chars', () => {
    expect(validateReview({ type: 'review', message: 'a'.repeat(1000) })).toMatchObject({ ok: true });
  });
});

describe('Client file section validation', () => {
  it('returns the section unchanged when valid', () => {
    expect(resolveSection('Finance')).toBe('Finance');
    expect(resolveSection('Brand Identity')).toBe('Brand Identity');
    expect(resolveSection('Creatives')).toBe('Creatives');
  });

  it('falls back to General for unknown section', () => {
    expect(resolveSection('Random')).toBe('General');
    expect(resolveSection('hacking')).toBe('General');
  });

  it('falls back to General for null', () => {
    expect(resolveSection(null)).toBe('General');
  });

  it('all defined sections resolve to themselves', () => {
    VALID_SECTIONS.forEach(s => {
      expect(resolveSection(s)).toBe(s);
    });
  });
});

describe('Google Sheets — parseOpenTasks', () => {
  const HEADERS = ['ID', 'Category', 'Description', 'Owner', 'DateAligned', '', 'DueDate', 'Status', '', '', '', '', 'RAG', 'Month', 'Remarks'];

  it('returns empty array when fewer than 2 rows', () => {
    expect(parseOpenTasks([])).toEqual([]);
    expect(parseOpenTasks([HEADERS])).toEqual([]);
  });

  it('filters out closed tasks', () => {
    const rows = [HEADERS, ['T1', 'Design', 'Logo refresh', 'Pratik', '01-Jun', '', '15-Jun', 'closed', '', '', '', '', 'on track', 'Jun-2026', '']];
    expect(parseOpenTasks(rows)).toHaveLength(0);
  });

  it('includes open and in-progress tasks', () => {
    const rows = [
      HEADERS,
      ['T1', 'Design', 'Logo refresh', 'Pratik', '01-Jun', '', '15-Jun', 'in progress', '', '', '', '', 'on track', 'Jun-2026', ''],
      ['T2', 'Video', 'Reel edit', 'Nimesh', '02-Jun', '', '20-Jun', 'not started', '', '', '', '', 'at risk', 'Jun-2026', ''],
    ];
    const result = parseOpenTasks(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('T1');
    expect(result[1].ragFlag).toBe('at risk');
  });

  it('skips rows with no ID or description', () => {
    const rows = [
      HEADERS,
      ['', 'Design', 'No ID task', 'Pratik', '', '', '', 'in progress', '', '', '', '', '', '', ''],
      ['T2', 'Video', '', 'Nimesh', '', '', '', 'in progress', '', '', '', '', '', '', ''],
    ];
    expect(parseOpenTasks(rows)).toHaveLength(0);
  });

  it('maps columns correctly', () => {
    const rows = [HEADERS, ['T99', 'SEO', 'Blog post', 'Aman', '01-Jul', '', '31-Jul', 'in progress', '', '', '', '', 'overdue', 'Jul-2026', 'delayed once']];
    const [task] = parseOpenTasks(rows);
    expect(task.id).toBe('T99');
    expect(task.category).toBe('SEO');
    expect(task.description).toBe('Blog post');
    expect(task.owner).toBe('Aman');
    expect(task.dueDate).toBe('31-Jul');
    expect(task.ragFlag).toBe('overdue');
    expect(task.month).toBe('Jul-2026');
    expect(task.remarks).toBe('delayed once');
  });
});

describe('Google Sheets — parseMonthlySummary', () => {
  const HEADERS = ['Month', 'Aligned', 'Closed', 'Open', 'Closure Rate', 'At Risk', 'Overdue'];

  it('returns empty array when fewer than 2 rows', () => {
    expect(parseMonthlySummary([])).toEqual([]);
    expect(parseMonthlySummary([HEADERS])).toEqual([]);
  });

  it('parses percentage closure rate correctly', () => {
    const rows = [HEADERS, ['Jun-2026', '10', '8', '2', '80%', '1', '0']];
    const [m] = parseMonthlySummary(rows);
    expect(m.closureRate).toBe(80);
    expect(m.closed).toBe(8);
    expect(m.aligned).toBe(10);
  });

  it('filters out months with zero aligned tasks', () => {
    const rows = [
      HEADERS,
      ['May-2026', '0', '0', '0', '0%', '0', '0'],
      ['Jun-2026', '5', '3', '2', '60%', '0', '0'],
    ];
    const result = parseMonthlySummary(rows);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('Jun-2026');
  });

  it('skips rows with invalid month format', () => {
    const rows = [HEADERS, ['Total', '50', '40', '10', '80%', '2', '1']];
    expect(parseMonthlySummary(rows)).toHaveLength(0);
  });

  it('handles decimal closure rate', () => {
    const rows = [HEADERS, ['Jul-2026', '7', '5', '2', '71.4%', '1', '0']];
    const [m] = parseMonthlySummary(rows);
    expect(m.closureRate).toBeCloseTo(71.4, 1);
  });

  it('returns multiple months in order', () => {
    const rows = [
      HEADERS,
      ['May-2026', '8', '6', '2', '75%', '0', '0'],
      ['Jun-2026', '10', '9', '1', '90%', '0', '0'],
    ];
    const result = parseMonthlySummary(rows);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('May-2026');
    expect(result[1].month).toBe('Jun-2026');
  });
});
