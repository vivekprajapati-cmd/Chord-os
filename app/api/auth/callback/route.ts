import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email) {
      const admin = createAdminClient();

      // Check if people row already exists
      const { data: existing } = await admin
        .from('people')
        .select('id, auth_user_id')
        .eq('email', user.email)
        .maybeSingle();

      if (existing) {
        // Link auth_user_id if not yet linked
        if (!existing.auth_user_id) {
          await admin
            .from('people')
            .update({ auth_user_id: user.id })
            .eq('email', user.email);
        }
      } else {
        // First login — auto-create people row from Slack profile
        const meta = user.user_metadata ?? {};
        const fullName = meta.full_name ?? meta.name ?? meta.preferred_username ?? user.email.split('@')[0];

        await admin.from('people').insert({
          auth_user_id: user.id,
          name: fullName,
          email: user.email,
          role: '',
          department: '',
          seniority: 'Mid',
          location: 'Mumbai',
          is_team_lead: false,
        });
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
