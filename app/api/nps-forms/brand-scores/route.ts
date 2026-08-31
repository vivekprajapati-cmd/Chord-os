import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFormResponses } from '@/lib/google-forms';

export const runtime = 'nodejs';

// GET /api/nps-forms/brand-scores?brand_ids=a,b,c
// Returns { scores: { [brand_id]: avg_score | null } }
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brandIds = searchParams.get('brand_ids')?.split(',').filter(Boolean) ?? [];
  if (!brandIds.length) return NextResponse.json({ scores: {} });

  const admin = createAdminClient();

  const [{ data: forms }, { data: person }] = await Promise.all([
    admin.from('nps_forms').select('brand_id, form_id').in('brand_id', brandIds),
    admin.from('people').select('google_refresh_token')
      .eq('email', 'vivek.prajapati@1702digital.com')
      .not('google_refresh_token', 'is', null)
      .maybeSingle(),
  ]);

  if (!person?.google_refresh_token || !forms?.length) {
    return NextResponse.json({ scores: Object.fromEntries(brandIds.map(id => [id, null])) });
  }

  // Fetch responses per form, group by brand
  const byBrand: Record<string, number[]> = {};
  await Promise.all((forms ?? []).map(async (f) => {
    const responses = await getFormResponses(person.google_refresh_token!, f.form_id);
    if (!byBrand[f.brand_id]) byBrand[f.brand_id] = [];
    for (const r of responses) {
      if (r.score !== null) {
        byBrand[f.brand_id].push(r.score);
      } else {
        // fallback: average all numeric answers for forms with no 1-10 question
        const nums = Object.values(r.answers).map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 10);
        if (nums.length) byBrand[f.brand_id].push(nums.reduce((a, b) => a + b, 0) / nums.length);
      }
    }
  }));

  const scores: Record<string, number | null> = {};
  for (const id of brandIds) {
    const s = byBrand[id];
    scores[id] = s?.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length * 10) / 10 : null;
  }

  return NextResponse.json({ scores });
}
