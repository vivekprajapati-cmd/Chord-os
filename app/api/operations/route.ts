import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getAdmin(supabase: Awaited<ReturnType<typeof createClient>>, email: string) {
  const { data } = await supabase.from('people').select('id, access_tier').eq('email', email).maybeSingle();
  return data as { id: string; access_tier: string } | null;
}

// POST — add a new link
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const person = await getAdmin(supabase, user.email);
    if (!person) return NextResponse.json({ error: 'Person not found.' }, { status: 403 });
    if (person.access_tier !== 'admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

    const body = await req.json();
    const { title, url } = body;
    if (!title?.trim() || !url?.trim()) return NextResponse.json({ error: 'Title and URL required.' }, { status: 400 });

    // Get current max sort_order
    const { data: existing } = await supabase.from('ops_links').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const nextOrder = ((existing?.[0] as any)?.sort_order ?? -1) + 1;

    const { data, error } = await supabase.from('ops_links')
      .insert({ title: title.trim(), url: url.trim(), added_by_id: person.id, sort_order: nextOrder })
      .select('id, title, url, sort_order')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[ops POST]', err);
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}

// PATCH — edit a link
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const person = await getAdmin(supabase, user.email!);
  if (person?.access_tier !== 'admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  const { id, title, url } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, string> = {};
  if (title?.trim()) updates.title = title.trim();
  if (url?.trim()) updates.url = url.trim();

  const { error } = await supabase.from('ops_links').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove a link
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const person = await getAdmin(supabase, user.email!);
  if (person?.access_tier !== 'admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('ops_links').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
