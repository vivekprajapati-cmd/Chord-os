import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthedPerson } from '@/lib/supabase/get-authed-person';

export async function POST(req: NextRequest) {
  const { person, unauth } = await getAuthedPerson('id');
  if (unauth) return unauth;
  if (!person) return NextResponse.json({ error: 'Person record not found' }, { status: 404 });

  const { type, start_date, end_date, reason, approver_id } = await req.json();

  if (!type || !start_date || !end_date) {
    return NextResponse.json({ error: 'type, start_date and end_date are required' }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
  }
  if (!approver_id) {
    return NextResponse.json({ error: 'approver_id is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: leave, error } = await admin
    .from('leaves')
    .insert({ person_id: person.id, type, start_date, end_date, reason: reason || null, status: 'pending', approver_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leave }, { status: 201 });
}
