import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status } = await req.json();
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: person } = await admin
    .from('people')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

  // only the assigned approver can approve/reject
  const { data: leave } = await admin
    .from('leaves')
    .select('id, approver_id')
    .eq('id', id)
    .maybeSingle();

  if (!leave) return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
  if (leave.approver_id !== person.id) {
    return NextResponse.json({ error: 'Not authorised to action this leave' }, { status: 403 });
  }

  const { data: updated, error } = await admin
    .from('leaves')
    .update({ status, approved_by: person.id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leave: updated });
}
