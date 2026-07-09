import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { data: clientAccount } = await supabase
      .from('client_accounts')
      .select('id, brand_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!clientAccount || !clientAccount.is_active) {
      return NextResponse.json({ error: 'Client account not found or inactive.' }, { status: 403 });
    }

    const body = await req.json();
    const { type, message } = body;

    if (!type || !message) {
      return NextResponse.json({ error: 'type and message are required.' }, { status: 400 });
    }
    if (!['review', 'attention'].includes(type)) {
      return NextResponse.json({ error: 'type must be review or attention.' }, { status: 400 });
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message cannot be empty.' }, { status: 400 });
    }
    if (message.trim().length > 1000) {
      return NextResponse.json({ error: 'message too long (max 1000 chars).' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('client_reviews').insert({
      client_account_id: clientAccount.id,
      brand_id: clientAccount.brand_id,
      type,
      message: message.trim(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 });
  }
}
