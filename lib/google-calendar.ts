// Google Calendar API helper

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

export async function createCalendarEvent({
  refreshToken,
  title,
  description,
  startAt,
  endAt,
  location,
}: {
  refreshToken: string;
  title: string;
  description?: string;
  startAt: string; // ISO 8601
  endAt: string;   // ISO 8601
  location?: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return { success: false, error: 'Failed to get access token' };

  const event = {
    summary: title,
    description: description ?? '',
    location: location ?? '',
    start: { dateTime: startAt, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endAt, timeZone: 'Asia/Kolkata' },
  };

  const res = await fetch(CALENDAR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.json();
    return { success: false, error: err.error?.message ?? 'Calendar API error' };
  }

  const data = await res.json();
  return { success: true, eventId: data.id };
}

// Fetch total hours of Google Calendar events for a given day (IST)
export async function getGoogleEventsHours({
  refreshToken,
  date, // YYYY-MM-DD in IST
}: {
  refreshToken: string;
  date: string;
}): Promise<number> {
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return 0;

  const dayStart = new Date(`${date}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${date}T23:59:59+05:30`).toISOString();

  const url = new URL(CALENDAR_URL);
  url.searchParams.set('timeMin', dayStart);
  url.searchParams.set('timeMax', dayEnd);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return 0;

  const data = await res.json();
  const events: { start?: { dateTime?: string }; end?: { dateTime?: string } }[] = data.items ?? [];

  const totalMs = events.reduce((acc, e) => {
    if (!e.start?.dateTime || !e.end?.dateTime) return acc;
    return acc + (new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime());
  }, 0);

  return Math.round((totalMs / 3600000) * 10) / 10; // hours, 1 decimal
}

export async function deleteCalendarEvent({
  refreshToken,
  eventId,
}: {
  refreshToken: string;
  eventId: string;
}): Promise<boolean> {
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return false;

  const res = await fetch(`${CALENDAR_URL.replace('/events', '')}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.ok || res.status === 404;
}
