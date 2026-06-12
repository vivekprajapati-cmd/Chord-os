import { describe, it, expect } from 'vitest';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Replicates the IST week-start logic from calendar/page.tsx
function getISTWeekStart(nowUTC: Date): Date {
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
  const istDateStr = nowIST.toISOString().split('T')[0];
  const istDateUTC = new Date(istDateStr + 'T00:00:00Z');
  const dayOfWeek = istDateUTC.getUTCDay();
  const mondayUTC = new Date(istDateUTC);
  mondayUTC.setUTCDate(istDateUTC.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return mondayUTC;
}

// Replicates flexible task deadline storage from api/tasks/route.ts
function resolveFlexibleDeadline(dateStr: string): string {
  return `${dateStr.slice(0, 10)}T23:59:59Z`;
}

// Replicates the calendar chip day string logic from calendar-client.tsx
function getDayString(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

describe('IST week start', () => {
  it('returns Monday for a Wednesday in IST', () => {
    // 2024-01-10 Wednesday 10:00 IST = 2024-01-10 04:30 UTC
    const now = new Date('2024-01-10T04:30:00Z');
    const weekStart = getISTWeekStart(now);
    expect(weekStart.toISOString().split('T')[0]).toBe('2024-01-08'); // Monday
  });

  it('returns correct Monday when UTC is Sunday but IST is Monday', () => {
    // 2024-01-14 Sunday 19:30 UTC = 2024-01-15 Monday 01:00 IST
    const now = new Date('2024-01-14T19:30:00Z');
    const weekStart = getISTWeekStart(now);
    expect(weekStart.toISOString().split('T')[0]).toBe('2024-01-15'); // Monday IST
  });

  it('returns same Monday when already on Monday in IST', () => {
    // 2024-01-08 Monday 10:00 IST = 2024-01-08 04:30 UTC
    const now = new Date('2024-01-08T04:30:00Z');
    const weekStart = getISTWeekStart(now);
    expect(weekStart.toISOString().split('T')[0]).toBe('2024-01-08');
  });

  it('returns previous Monday for Sunday in IST', () => {
    // 2024-01-14 Sunday 10:00 IST = 2024-01-14 04:30 UTC
    const now = new Date('2024-01-14T04:30:00Z');
    const weekStart = getISTWeekStart(now);
    expect(weekStart.toISOString().split('T')[0]).toBe('2024-01-08');
  });
});

describe('Flexible task deadline', () => {
  it('appends T23:59:59Z to a date string', () => {
    expect(resolveFlexibleDeadline('2024-01-16')).toBe('2024-01-16T23:59:59Z');
  });

  it('strips time portion if datetime string is passed', () => {
    expect(resolveFlexibleDeadline('2024-01-16T12:00:00')).toBe('2024-01-16T23:59:59Z');
  });

  it('deadline day matches selected date — not shifted to next day', () => {
    const deadline = resolveFlexibleDeadline('2024-01-16');
    const date = new Date(deadline);
    // Display using UTC (as the app does) — should show Jan 16, not Jan 17
    const displayed = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    expect(displayed).toContain('16');
  });
});

describe('Calendar chip day string', () => {
  it('builds day string without timezone shift', () => {
    // Jan 16 local — toISOString() in IST would give Jan 15 UTC
    const d = new Date(2024, 0, 16); // local Jan 16
    const dayStr = getDayString(d);
    expect(dayStr).toBe('2024-01-16');
  });

  it('does not bleed to next day for late IST times', () => {
    // 11:30 PM IST on Jan 16 — toISOString() would give Jan 16 18:00 UTC = still Jan 16
    // But midnight IST (00:00) = Jan 15 18:30 UTC — getDayString must use local components
    const d = new Date(2024, 0, 16, 23, 30, 0); // 11:30 PM local
    expect(getDayString(d)).toBe('2024-01-16');
  });
});
