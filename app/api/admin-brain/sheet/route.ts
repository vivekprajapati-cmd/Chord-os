import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function parseCSV(text: string): string[][] {
  return text.split('\n').map(line => {
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    cells.push(cur.trim());
    return cells;
  });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase.from('people').select('access_tier').eq('email', user.email!).maybeSingle();
  if ((person as any)?.access_tier !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 });

  // Get sheet URL from settings
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'backlog_sheet_url').maybeSingle();
  const sheetUrl = (setting as any)?.value;
  if (!sheetUrl) return NextResponse.json({ error: 'no_sheet_url' }, { status: 404 });

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return NextResponse.json({ error: 'invalid_url' }, { status: 400 });

  // Month param e.g. "Aug 2026" — maps to sheet tab name
  const { searchParams } = new URL((req as Request).url);
  const month = searchParams.get('month') ?? '';

  // Fetch as public CSV export (works if sheet is shared with "anyone with link can view")
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${month ? `&sheetName=${encodeURIComponent(month)}` : ''}`;
  const res = await fetch(csvUrl);
  if (!res.ok) return NextResponse.json({ error: 'fetch_failed', status: res.status }, { status: 502 });

  const text = await res.text();
  const rows = parseCSV(text);

  // Parse sections
  const snapshot = {
    total: rows[16]?.[0] || '0',
    completed: rows[16]?.[3] || '0',
    remaining: rows[16]?.[6] || '0',
    pct_complete: rows[16]?.[9] || '0%',
    overdue: rows[16]?.[12] || '0',
    high_priority: rows[16]?.[15] || '0',
    as_of: rows[2]?.[1] || '',
  };

  const stageMapping = rows.slice(6, 13).filter(r => r[0]).map(r => ({
    stage: r[0], team: r[1], open: r[2],
  }));

  const teamBreakdown = rows.slice(21, 25).filter(r => r[0]).map(r => ({
    team: r[0], open: r[1],
  }));

  const statusBreakdown = rows.slice(28, 33).filter(r => r[0]).map(r => ({
    status: r[0], count: r[1],
  }));

  // Priority tasks — rows 54-62
  const priorityTasks = rows.slice(54, 62).filter(r => r[0] && r[0] !== 'Rank').map(r => ({
    rank: r[0], brand: r[1], month: r[2], remaining: r[3],
    deadline: r[4], days_left: r[5], status: r[6], priority: r[7],
  }));

  // Tracker — rows 66 onward until DAILY ALLOCATION LOG
  const trackerStart = rows.findIndex(r => r[0] === 'Brand' && r[1] === 'Month' && r[2] === 'Total');
  const trackerEnd = rows.findIndex(r => r[0]?.includes('DAILY ALLOCATION'));
  const tracker = rows.slice(trackerStart + 1, trackerEnd).filter(r => r[0] && r[0] !== 'TOTAL').map(r => ({
    brand: r[0], month: r[1], total: r[2],
    static: r[3], pending_shoot: r[4], in_progress: r[5],
    shot_ne: r[6], ai_mg: r[7], influencer: r[8], stories: r[9],
    completed: r[10], remaining: r[11], deadline: r[14], days_left: r[15],
    pct_complete: r[16], status: r[17], priority: r[18],
  }));

  // Daily log — rows after DAILY ALLOCATION LOG header + 2
  const logStart = trackerEnd + 2;
  const dailyLog = rows.slice(logStart + 1).filter(r => r[0]).map(r => ({
    date: r[0], brand_month: r[1], qty: r[2], note: r[3],
  }));

  return NextResponse.json({ snapshot, stageMapping, teamBreakdown, statusBreakdown, priorityTasks, tracker, dailyLog });
}
