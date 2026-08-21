import { describe, it, expect } from 'vitest';

// --- Pure functions extracted from the table components ---

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round((a / b) * 100);
}

function daysInMonth(month: string) {
  const d = new Date(month + 'T00:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function weeksInMonth(month: string) {
  return Math.ceil(daysInMonth(month) / 7);
}

function getPrevWeek(ws: string) {
  const d = new Date(ws);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function brandAvatarIndex(name: string, total: number) {
  return name.charCodeAt(0) % total;
}

function ormPct(logDays: string[], totalDays: number) {
  if (!totalDays) return null;
  return Math.round((logDays.length / totalDays) * 100);
}

function socialPct(logWeeks: string[], totalWeeks: number) {
  if (!totalWeeks) return null;
  return Math.round((logWeeks.length / totalWeeks) * 100);
}

// --- pct() ---
describe('pct()', () => {
  it('returns correct percentage', () => {
    expect(pct(8, 10)).toBe(80);
    expect(pct(5, 10)).toBe(50);
    expect(pct(1, 3)).toBe(33);
  });

  it('returns null when denominator is 0', () => {
    expect(pct(5, 0)).toBeNull();
    expect(pct(0, 0)).toBeNull();
  });

  it('returns 0 when numerator is 0', () => {
    expect(pct(0, 10)).toBe(0);
  });

  it('returns 100 when fully complete', () => {
    expect(pct(10, 10)).toBe(100);
  });

  it('rounds correctly', () => {
    expect(pct(2, 3)).toBe(67);  // 66.67 → 67
    expect(pct(1, 6)).toBe(17);  // 16.67 → 17
  });
});

// --- daysInMonth() ---
describe('daysInMonth()', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth('2026-01-01')).toBe(31);
  });

  it('returns 28 for February in non-leap year', () => {
    expect(daysInMonth('2025-02-01')).toBe(28);
  });

  it('returns 29 for February in leap year', () => {
    expect(daysInMonth('2024-02-01')).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(daysInMonth('2026-04-01')).toBe(30);
  });

  it('returns 31 for August', () => {
    expect(daysInMonth('2026-08-01')).toBe(31);
  });
});

// --- weeksInMonth() ---
describe('weeksInMonth()', () => {
  it('returns 5 for a 31-day month', () => {
    expect(weeksInMonth('2026-01-01')).toBe(5);
  });

  it('returns 4 for February 2025 (28 days)', () => {
    expect(weeksInMonth('2025-02-01')).toBe(4);
  });

  it('always returns at least 4', () => {
    const months = ['2026-01-01','2026-02-01','2026-03-01','2026-04-01'];
    months.forEach(m => expect(weeksInMonth(m)).toBeGreaterThanOrEqual(4));
  });
});

// --- getPrevWeek() ---
describe('getPrevWeek()', () => {
  it('returns exactly 7 days earlier', () => {
    expect(getPrevWeek('2026-08-10')).toBe('2026-08-03');
  });

  it('crosses month boundary correctly', () => {
    expect(getPrevWeek('2026-08-03')).toBe('2026-07-27');
  });

  it('crosses year boundary correctly', () => {
    expect(getPrevWeek('2026-01-05')).toBe('2025-12-29');
  });
});

// --- brandAvatarIndex() ---
describe('brandAvatarIndex()', () => {
  it('returns index within bounds', () => {
    const total = 6;
    ['IndiaGate', 'Cornitos', 'Woodland', 'Provogue', 'AlphaKid', 'dabur'].forEach(name => {
      const idx = brandAvatarIndex(name, total);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(total);
    });
  });

  it('is deterministic for same name', () => {
    expect(brandAvatarIndex('IndiaGate', 6)).toBe(brandAvatarIndex('IndiaGate', 6));
  });

  it('differs for names starting with different chars', () => {
    // 'I' (73) % 6 = 1, 'C' (67) % 6 = 1, 'W' (87) % 6 = 3
    expect(brandAvatarIndex('Woodland', 6)).toBe(87 % 6);
    expect(brandAvatarIndex('IndiaGate', 6)).toBe(73 % 6);
  });
});

// --- tracker rate calculations ---
describe('ormPct()', () => {
  it('calculates daily ORM rate correctly', () => {
    // 24 updates out of 30 days = 80%
    const logs = Array.from({ length: 24 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
    expect(ormPct(logs, 30)).toBe(80);
  });

  it('returns 0 when no logs', () => {
    expect(ormPct([], 30)).toBe(0);
  });

  it('returns null when totalDays is 0', () => {
    expect(ormPct(['2026-08-01'], 0)).toBeNull();
  });

  it('returns 100 when every day logged', () => {
    const logs = Array.from({ length: 30 }, (_, i) => `day-${i}`);
    expect(ormPct(logs, 30)).toBe(100);
  });
});

describe('socialPct()', () => {
  it('calculates weekly social rate correctly', () => {
    // 3 updates out of 5 weeks = 60%
    expect(socialPct(['w1', 'w2', 'w3'], 5)).toBe(60);
  });

  it('returns 0 when no logs', () => {
    expect(socialPct([], 5)).toBe(0);
  });

  it('returns null when totalWeeks is 0', () => {
    expect(socialPct(['w1'], 0)).toBeNull();
  });
});
