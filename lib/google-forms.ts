// Google Forms API helper

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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
  if (!data.access_token) { console.error('[google-forms] token exchange failed:', data); return null; }
  return data.access_token;
}

export type NpsResponse = {
  responseId: string;
  createTime: string;
  score: number | null;
  answers: Record<string, string>; // questionId -> answer text
};

export async function getFormResponses(
  refreshToken: string,
  formId: string,
): Promise<NpsResponse[]> {
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return [];

  const [formRes, responsesRes] = await Promise.all([
    fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!responsesRes.ok) {
    const errBody = await responsesRes.text();
    console.error('[google-forms] responses API error', { formId, status: responsesRes.status, body: errBody });
    return [];
  }

  const { responses = [] } = await responsesRes.json();

  // Build question index: id -> title (best-effort — requires forms.body.readonly scope)
  const questions: Record<string, string> = {};
  if (formRes.ok) {
    const form = await formRes.json();
    for (const item of form.items ?? []) {
      if (item.questionItem?.question?.questionId) {
        questions[item.questionItem.question.questionId] = item.title ?? '';
      }
    }
  }

  return responses.map((r: any) => {
    const answers: Record<string, string> = {};
    let score: number | null = null;

    for (const [qId, ans] of Object.entries(r.answers ?? {})) {
      const text = (ans as any).textAnswers?.answers?.[0]?.value ?? '';
      const label = questions[qId] ?? qId;
      answers[label] = text;

      // Detect NPS score: label-based if we have labels, else any 0-10 numeric answer
      const num = Number(text);
      const isNumeric = text.trim() !== '' && !isNaN(num);
      const lower = label.toLowerCase();
      const hasLabel = label !== qId;
      if (isNumeric && (hasLabel
        ? (lower.includes('nps') || lower.includes('score') || lower.includes('rate'))
        : num >= 0 && num <= 10)) {
        score = num;
      }
    }

    return { responseId: r.responseId, createTime: r.createTime, score, answers };
  });
}

export function extractFormId(input: string): string | null {
  // Handle /forms/d/e/<id>/viewform style URLs (published forms)
  const publishedMatch = input.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]{20,})/);
  if (publishedMatch) return publishedMatch[1];
  // Handle /forms/d/<id> style URLs (edit URLs)
  const editMatch = input.match(/\/forms\/d\/([a-zA-Z0-9_-]{20,})/);
  if (editMatch) return editMatch[1];
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  return null;
}
