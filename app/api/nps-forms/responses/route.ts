import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFormResponses } from '@/lib/google-forms';

export const runtime = 'nodejs';

// GET /api/nps-forms/responses?brand_id=xxx&quarter=Q3+2026 (quarter optional)
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brand_id = searchParams.get('brand_id');
  const quarter = searchParams.get('quarter'); // optional filter
  if (!brand_id) return NextResponse.json({ error: 'brand_id required' }, { status: 400 });

  const admin = createAdminClient();

  // Get forms for this brand (filtered by quarter if provided)
  let query = admin.from('nps_forms').select('id, form_id, quarter').eq('brand_id', brand_id);
  if (quarter) query = query.eq('quarter', quarter);
  const { data: forms } = await query;

  if (!forms?.length) return NextResponse.json({ responses: [], quarters: [] });

  // Get the Google refresh token from the first connected user (admin who linked Google)
  const { data: person } = await admin
    .from('people')
    .select('google_refresh_token, email')
    .eq('email', 'vivek.prajapati@1702digital.com')
    .not('google_refresh_token', 'is', null)
    .maybeSingle();

  if (!person?.google_refresh_token) {
    return NextResponse.json({ error: 'No Google account connected. Connect Google Calendar first.' }, { status: 503 });
  }

  // Fetch responses from all matched forms in parallel
  const results = await Promise.all(
    forms.map(async (f) => {
      const responses = await getFormResponses(person.google_refresh_token!, f.form_id);
      return responses.map(r => ({ ...r, quarter: f.quarter, form_id: f.form_id }));
    })
  );

  // Get all quarters for this brand (for the filter chips)
  const { data: allForms } = await admin.from('nps_forms').select('quarter').eq('brand_id', brand_id);
  const quarters = [...new Set((allForms ?? []).map(f => f.quarter))].sort();

  return NextResponse.json({
    responses: results.flat().sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
    quarters,
  });
}
