import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CAN_MANAGE = ['admin', 'lead', 'operations'];

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brand_id = searchParams.get('brand_id');
  const doc_type = searchParams.get('doc_type');
  const month = searchParams.get('month');
  const week = searchParams.get('week');

  let q = supabase
    .from('brand_ops_docs')
    .select('id, brand_id, doc_type, month, week, link, file_path, created_at, brands(id, name, slug), uploaded_by:people!brand_ops_docs_uploaded_by_id_fkey(name)')
    .order('created_at', { ascending: false });

  if (brand_id) q = q.eq('brand_id', brand_id);
  if (doc_type) q = q.eq('doc_type', doc_type);
  if (month) q = q.eq('month', month);
  if (week) q = q.eq('week', parseInt(week));

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  if (!CAN_MANAGE.includes((person as any)?.access_tier)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { brand_id, doc_type, month, week, link, file_path } = body;

  if (!brand_id || !doc_type || !month || !week) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!link && !file_path) {
    return NextResponse.json({ error: 'Provide a link or file' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('brand_ops_docs')
    .insert({ brand_id, doc_type, month, week, link: link || null, file_path: file_path || null, uploaded_by_id: person!.id })
    .select('id, brand_id, doc_type, month, week, link, file_path, created_at, brands(id, name, slug), uploaded_by:people!brand_ops_docs_uploaded_by_id_fkey(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
