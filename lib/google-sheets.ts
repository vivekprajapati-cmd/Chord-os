const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchRange(sheetId: string, range: string): Promise<string[][]> {
  if (!API_KEY) throw new Error('GOOGLE_SHEETS_API_KEY not set');
  const url = `${BASE}/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } }); // 5 min cache
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return (json.values as string[][] | undefined) ?? [];
}

// ---- Task Tracker ----
export type SheetTask = {
  id: string;
  category: string;
  description: string;
  owner: string;
  dateAligned: string;
  dueDate: string;
  status: string;
  ragFlag: string;
  month: string;
  remarks: string;
};

export async function fetchOpenTasks(sheetId: string): Promise<SheetTask[]> {
  // Row 1: note, Row 2: headers, Row 3+: data
  const rows = await fetchRange(sheetId, 'Task Tracker!A2:P200');
  if (rows.length < 2) return [];

  const data = rows.slice(1); // skip header row
  return data
    .filter(r => r[0] && r[2] && r[7]?.toLowerCase() !== 'closed')
    .map(r => ({
      id: r[0] ?? '',
      category: r[1] ?? '',
      description: r[2] ?? '',
      owner: r[3] ?? '',
      dateAligned: r[4] ?? '',
      dueDate: r[6] ?? '',
      status: r[7] ?? '',
      ragFlag: r[12] ?? '',
      month: r[13] ?? '',
      remarks: r[14] ?? '',
    }));
}

// ---- Monthly Summary ----
export type MonthSummary = {
  month: string;
  aligned: number;
  closed: number;
  open: number;
  closureRate: number; // 0-100
  atRisk: number;
  overdue: number;
};

export async function fetchMonthlySummary(sheetId: string): Promise<MonthSummary[]> {
  // Row 4: headers, Row 5+: data
  const rows = await fetchRange(sheetId, 'Monthly Summary!A4:G30');
  if (rows.length < 2) return [];

  const data = rows.slice(1); // skip header
  return data
    .filter(r => r[0] && r[0].match(/\w{3}-\d{4}/)) // valid "Jun-2026" format
    .map(r => ({
      month: r[0],
      aligned: parseInt(r[1]) || 0,
      closed: parseInt(r[2]) || 0,
      open: parseInt(r[3]) || 0,
      closureRate: parseFloat(r[4]?.replace('%', '')) || 0,
      atRisk: parseInt(r[5]) || 0,
      overdue: parseInt(r[6]) || 0,
    }))
    .filter(m => m.aligned > 0); // only months with actual tasks
}

// ---- SOW Achievement (KPI Tracker PROCESS section) ----
export type SowMonth = { month: string; pct: number | null };

export async function fetchSowAchievement(sheetId: string): Promise<SowMonth[]> {
  // PROCESS section starts around row 23 in KPI TRACKER sheet
  const rows = await fetchRange(sheetId, 'KPI TRACKER !A23:N30');
  if (!rows.length) return [];

  // Find the "% SOW achieved" row
  const sowRow = rows.find(r => r[2]?.toLowerCase().includes('sow achieved'));
  if (!sowRow) return [];

  // Month headers are in row index 0 (cols D onward = index 4+): Mar 26, Apr 26...
  const headerRow = rows[0];
  const months = headerRow.slice(4); // Mar 26, Apr 26, May 26, Jun 26, Jul 26...
  const values = sowRow.slice(4);

  return months.map((m, i) => ({
    month: m?.trim() ?? '',
    pct: values[i] ? parseFloat(values[i].replace('%', '')) : null,
  })).filter(m => m.month);
}
