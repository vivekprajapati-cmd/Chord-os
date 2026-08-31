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
  return data.access_token ?? null;
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

  if (!formRes.ok || !responsesRes.ok) return [];

  const form = await formRes.json();
  const { responses = [] } = await responsesRes.json();

  // Build question index: id -> title
  const questions: Record<string, string> = {};
  for (const item of form.items ?? []) {
    if (item.questionItem?.question?.questionId) {
      questions[item.questionItem.question.questionId] = item.title ?? '';
    }
  }

  return responses.map((r: any) => {
    const answers: Record<string, string> = {};
    let score: number | null = null;

    for (const [qId, ans] of Object.entries(r.answers ?? {})) {
      const text = (ans as any).textAnswers?.answers?.[0]?.value ?? '';
      const label = questions[qId] ?? qId;
      answers[label] = text;

      // Detect NPS score: a numeric answer to a question containing "nps", "score", or "rate"
      const lower = label.toLowerCase();
      if ((lower.includes('nps') || lower.includes('score') || lower.includes('rate')) && !isNaN(Number(text))) {
        score = Number(text);
      }
    }

    return { responseId: r.responseId, createTime: r.createTime, score, answers };
  });
}

export function extractFormId(input: string): string | null {
  // Handle full URL or bare form ID
  const match = input.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Bare ID (no slashes)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  return null;
}
