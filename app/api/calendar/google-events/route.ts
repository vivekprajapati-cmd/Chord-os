import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token ?? null;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('google_refresh_token, google_calendar_connected')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person?.google_refresh_token || !person?.google_calendar_connected) {
    return NextResponse.json({ events: [] });
  }

  const accessToken = await getAccessToken(person.google_refresh_token);
  if (!accessToken) return NextResponse.json({ events: [], token_expired: true });

  // Get week range from query params
  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get('timeMin') ?? new Date().toISOString();
  const timeMax = searchParams.get('timeMax') ?? new Date(Date.now() + 7 * 86400000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(`${CALENDAR_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401 || res.status === 403) return NextResponse.json({ events: [], token_expired: true });
  if (!res.ok) return NextResponse.json({ events: [] });

  const data = await res.json();

  // Normalize events
  const events = (data.items ?? []).map((e: any) => ({
    id: e.id,
    title: e.summary ?? 'Busy',
    start: e.start?.dateTime ? new Date(e.start.dateTime).toISOString() : e.start?.date,
    end: e.end?.dateTime ? new Date(e.end.dateTime).toISOString() : e.end?.date,
    isAllDay: !e.start?.dateTime,
    meetLink: e.hangoutLink ?? null,
    location: e.location ?? null,
    description: e.description ?? null,
    type: 'google', // distinguish from task blocks
  }));

  return NextResponse.json({ events });
}
