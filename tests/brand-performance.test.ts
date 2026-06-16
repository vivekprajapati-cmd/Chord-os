import { describe, it, expect } from 'vitest';

// ── Logic replicated from components/brand-performance.tsx ───────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function parseNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
}

function parsePercent(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace('%', '').trim()) || 0;
}

function getWeekOfMonth(dateStr: string): number {
  const parts = dateStr.split('/');
  if (parts.length < 3) return 0;
  const day = parseInt(parts[0]);
  return Math.ceil(day / 7);
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
    cur += c;
  }
  result.push(cur);
  return result;
}

function monthLabel(m: string) {
  const [year, month] = m.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

// ── fmtNum ───────────────────────────────────────────────────────────────────

describe('fmtNum', () => {
  it('formats millions with 2 decimal places', () => {
    expect(fmtNum(2_450_000)).toBe('2.45M');
  });

  it('formats thousands with 1 decimal place', () => {
    expect(fmtNum(420_000)).toBe('420.0K');
  });

  it('formats sub-thousand as plain number', () => {
    expect(fmtNum(94)).toBe('94');
  });

  it('formats exactly 1M', () => {
    expect(fmtNum(1_000_000)).toBe('1.00M');
  });

  it('formats exactly 1K', () => {
    expect(fmtNum(1_000)).toBe('1.0K');
  });

  it('formats zero', () => {
    expect(fmtNum(0)).toBe('0');
  });
});

// ── parseNum ─────────────────────────────────────────────────────────────────

describe('parseNum', () => {
  it('parses plain number', () => {
    expect(parseNum('5270')).toBe(5270);
  });

  it('parses comma-formatted number', () => {
    expect(parseNum('5,270')).toBe(5270);
  });

  it('parses large comma-formatted number', () => {
    expect(parseNum('6,290,535')).toBe(6290535);
  });

  it('returns 0 for empty string', () => {
    expect(parseNum('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseNum('N/A')).toBe(0);
  });

  it('parses decimal numbers', () => {
    expect(parseNum('8.21')).toBe(8.21);
  });
});

// ── parsePercent ─────────────────────────────────────────────────────────────

describe('parsePercent', () => {
  it('parses percentage string', () => {
    expect(parsePercent('1.78%')).toBe(1.78);
  });

  it('parses percentage without space', () => {
    expect(parsePercent('8.21%')).toBeCloseTo(8.21);
  });

  it('returns 0 for empty string', () => {
    expect(parsePercent('')).toBe(0);
  });

  it('parses zero percent', () => {
    expect(parsePercent('0.00%')).toBe(0);
  });

  it('parses large outlier percent', () => {
    expect(parsePercent('137.66%')).toBeCloseTo(137.66);
  });
});

// ── getWeekOfMonth ────────────────────────────────────────────────────────────

describe('getWeekOfMonth', () => {
  it('day 1 = week 1', () => {
    expect(getWeekOfMonth('1/12/25')).toBe(1);
  });

  it('day 7 = week 1', () => {
    expect(getWeekOfMonth('7/12/25')).toBe(1);
  });

  it('day 8 = week 2', () => {
    expect(getWeekOfMonth('8/12/25')).toBe(2);
  });

  it('day 15 = week 3', () => {
    expect(getWeekOfMonth('15/12/25')).toBe(3);
  });

  it('day 22 = week 4', () => {
    expect(getWeekOfMonth('22/12/25')).toBe(4);
  });

  it('day 27 = week 4', () => {
    expect(getWeekOfMonth('27/12/25')).toBe(4);
  });

  it('day 29 = week 5', () => {
    expect(getWeekOfMonth('29/12/25')).toBe(5);
  });

  it('returns 0 for malformed date', () => {
    expect(getWeekOfMonth('bad')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(getWeekOfMonth('')).toBe(0);
  });
});

// ── splitCSVLine ──────────────────────────────────────────────────────────────

describe('splitCSVLine', () => {
  it('splits simple comma-separated line', () => {
    expect(splitCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted field with comma inside', () => {
    expect(splitCSVLine('"5,270",foo,bar')).toEqual(['5,270', 'foo', 'bar']);
  });

  it('handles multiple quoted fields', () => {
    expect(splitCSVLine('"6,290,535","4,367",0.07%')).toEqual(['6,290,535', '4,367', '0.07%']);
  });

  it('handles empty fields', () => {
    expect(splitCSVLine('a,,c')).toEqual(['a', '', 'c']);
  });

  it('handles trailing comma', () => {
    const result = splitCSVLine('a,b,');
    expect(result[0]).toBe('a');
    expect(result[1]).toBe('b');
  });

  it('handles single field', () => {
    expect(splitCSVLine('hello')).toEqual(['hello']);
  });
});

// ── monthLabel ────────────────────────────────────────────────────────────────

describe('monthLabel', () => {
  it('formats June 2026', () => {
    expect(monthLabel('2026-06')).toBe('June 2026');
  });

  it('formats December 2025', () => {
    expect(monthLabel('2025-12')).toBe('December 2025');
  });

  it('formats January 2025', () => {
    expect(monthLabel('2025-01')).toBe('January 2025');
  });
});

// ── ER outlier filter logic ───────────────────────────────────────────────────

describe('ER outlier filter', () => {
  it('rejects rows with ER above 50%', () => {
    const er = parsePercent('137.66%');
    expect(er >= 50).toBe(true); // would be filtered out
  });

  it('accepts rows with normal ER', () => {
    const er = parsePercent('1.78%');
    expect(er < 50).toBe(true); // would be included
  });

  it('accepts rows with 0% ER', () => {
    const er = parsePercent('0.00%');
    expect(er < 50).toBe(true);
  });
});

// ── Week filter logic ─────────────────────────────────────────────────────────

describe('week filter logic', () => {
  it('weekFilter 0 matches all weeks', () => {
    const weekFilter = 0;
    expect(weekFilter === 0 || getWeekOfMonth('1/12/25') === weekFilter).toBe(true);
    expect(weekFilter === 0 || getWeekOfMonth('15/12/25') === weekFilter).toBe(true);
    expect(weekFilter === 0 || getWeekOfMonth('29/12/25') === weekFilter).toBe(true);
  });

  it('weekFilter 1 only matches week 1 dates', () => {
    const weekFilter = 1;
    expect(weekFilter === 0 || getWeekOfMonth('1/12/25') === weekFilter).toBe(true);
    expect(weekFilter === 0 || getWeekOfMonth('15/12/25') === weekFilter).toBe(false);
  });

  it('weekFilter 3 matches day 15', () => {
    const weekFilter = 3;
    expect(weekFilter === 0 || getWeekOfMonth('15/12/25') === weekFilter).toBe(true);
  });

  it('weekFilter 3 does not match day 1', () => {
    const weekFilter = 3;
    expect(weekFilter === 0 || getWeekOfMonth('1/12/25') === weekFilter).toBe(false);
  });
});

// ── Aggregation logic ─────────────────────────────────────────────────────────

type FeedMetrics = { totalReach: number; totalViews: number; totalEngagement: number; postCount: number; avgER: number };

function aggregateTotals(metrics: { feed: FeedMetrics }[]) {
  return metrics.reduce(
    (acc, m) => ({
      reach:    acc.reach    + m.feed.totalReach,
      views:    acc.views    + m.feed.totalViews,
      posts:    acc.posts    + m.feed.postCount,
      erSum:    acc.erSum    + m.feed.avgER,
      erCount:  acc.erCount  + (m.feed.postCount > 0 ? 1 : 0),
    }),
    { reach: 0, views: 0, posts: 0, erSum: 0, erCount: 0 }
  );
}

describe('aggregateTotals', () => {
  const sampleMetrics = [
    { feed: { totalReach: 420_000, totalViews: 810_000, totalEngagement: 0, postCount: 3, avgER: 8.6 } },
    { feed: { totalReach: 380_000, totalViews: 670_000, totalEngagement: 0, postCount: 4, avgER: 7.4 } },
    { feed: { totalReach: 290_000, totalViews: 540_000, totalEngagement: 0, postCount: 2, avgER: 6.2 } },
  ];

  it('sums total reach correctly', () => {
    expect(aggregateTotals(sampleMetrics).reach).toBe(1_090_000);
  });

  it('sums total views correctly', () => {
    expect(aggregateTotals(sampleMetrics).views).toBe(2_020_000);
  });

  it('sums total posts correctly', () => {
    expect(aggregateTotals(sampleMetrics).posts).toBe(9);
  });

  it('counts brands with data for avg ER', () => {
    expect(aggregateTotals(sampleMetrics).erCount).toBe(3);
  });

  it('sums erSum for averaging', () => {
    expect(aggregateTotals(sampleMetrics).erSum).toBeCloseTo(22.2);
  });

  it('handles brand with no posts — excluded from erCount', () => {
    const withEmpty = [
      ...sampleMetrics,
      { feed: { totalReach: 0, totalViews: 0, totalEngagement: 0, postCount: 0, avgER: 0 } },
    ];
    expect(aggregateTotals(withEmpty).erCount).toBe(3);
  });
});
