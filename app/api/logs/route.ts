import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity';

export async function POST(req: Request) {
  const body = await req.json();
  void logActivity(body);
  return NextResponse.json({ ok: true });
}
