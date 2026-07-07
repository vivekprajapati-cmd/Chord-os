import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  const tier = (person as any)?.access_tier ?? 'staff';
  if (tier !== 'admin' && tier !== 'operations') {
    return NextResponse.json({ error: 'Only admin or operations can create client logins.' }, { status: 403 });
  }

  const { email, password, brand_id } = await req.json();

  if (!email || !password || !brand_id) {
    return NextResponse.json({ error: 'email, password, and brand_id are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if client account already exists for this email
  const { data: existing } = await admin
    .from('client_accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'A client login already exists for this email.' }, { status: 409 });
  }

  // Create the Supabase auth user
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification
  });

  if (authError || !newUser?.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user.' }, { status: 500 });
  }

  // Insert into client_accounts
  const { error: insertError } = await admin.from('client_accounts').insert({
    auth_user_id: newUser.user.id,
    email,
    brand_id,
    created_by_person_id: person?.id ?? null,
    is_active: true,
  });

  if (insertError) {
    // Rollback: delete the auth user we just created
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, email });
}
