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

  // Try to create the Supabase auth user
  let authUserId: string;
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    // If already registered in auth.users, look up existing user and reuse
    if (authError.message.toLowerCase().includes('already been registered') || authError.message.toLowerCase().includes('already exists')) {
      const { data: userList } = await admin.auth.admin.listUsers();
      const existingAuthUser = userList?.users?.find(u => u.email === email);
      if (!existingAuthUser) {
        return NextResponse.json({ error: 'Auth user exists but could not be found. Contact support.' }, { status: 500 });
      }
      // Update password so the provided one is set
      await admin.auth.admin.updateUserById(existingAuthUser.id, { password });
      authUserId = existingAuthUser.id;
    } else {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  } else if (!newUser?.user) {
    return NextResponse.json({ error: 'Failed to create auth user.' }, { status: 500 });
  } else {
    authUserId = newUser.user.id;
  }

  // Insert into client_accounts
  const { data: inserted, error: insertError } = await admin.from('client_accounts').insert({
    auth_user_id: authUserId,
    email,
    brand_id,
    created_by_person_id: person?.id ?? null,
    is_active: true,
  }).select('id').single();

  if (insertError || !inserted) {
    // Only delete the auth user if we just created it
    if (newUser?.user) await admin.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: inserted.id, email });
}
