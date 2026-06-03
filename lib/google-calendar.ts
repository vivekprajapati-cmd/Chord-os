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
