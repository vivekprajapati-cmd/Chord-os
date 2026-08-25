import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: 'Groq API key not configured.' }, { status: 503 });

  const formData = await req.formData();
  const audio = formData.get('audio') as File | null;
  if (!audio) return NextResponse.json({ error: 'No audio file.' }, { status: 400 });

  const body = new FormData();
  body.append('file', audio, 'recording.webm');
  body.append('model', 'whisper-large-v3');
  body.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[transcribe] Groq error:', err);
    return NextResponse.json({ error: 'Transcription failed.' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ text: data.text ?? '' });
}
