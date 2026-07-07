import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET — fetch files for a client account (admin/operations only)
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientAccountId = searchParams.get('client_account_id');
  if (!clientAccountId) return NextResponse.json({ error: 'client_account_id required.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: files } = await admin
    .from('client_files')
    .select('id, file_name, storage_path, file_url, created_at, section')
    .eq('client_account_id', clientAccountId)
    .order('created_at', { ascending: false });

  const signed = await Promise.all(
    (files ?? []).map(async (f) => {
      if (!f.storage_path) return { ...f, file_url: f.file_url };
      const { data } = await admin.storage.from('client-files').createSignedUrl(f.storage_path, 3600);
      return { ...f, file_url: data?.signedUrl ?? f.file_url };
    })
  );

  return NextResponse.json({ files: signed });
}

// POST — upload a file for a client account (admin/operations only)
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
    return NextResponse.json({ error: 'Only admin or operations can upload client files.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const clientAccountId = formData.get('client_account_id') as string | null;
  const brandId = formData.get('brand_id') as string | null;
  const section = (formData.get('section') as string | null) ?? 'General';

  if (!file || !clientAccountId || !brandId) {
    return NextResponse.json({ error: 'file, client_account_id, and brand_id are required.' }, { status: 400 });
  }

  const validSections = ['Brand Identity', 'Finance', 'Reports', 'Contracts', 'Creatives', 'General'];
  const safeSection = validSections.includes(section) ? section : 'General';

  const admin = createAdminClient();

  // Verify client account belongs to this brand
  const { data: clientAccount } = await admin
    .from('client_accounts')
    .select('id')
    .eq('id', clientAccountId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!clientAccount) {
    return NextResponse.json({ error: 'Client account not found for this brand.' }, { status: 404 });
  }

  const fileExt = file.name.split('.').pop();
  const storagePath = `${clientAccountId}/${Date.now()}-${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from('client-files')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await admin.from('client_files').insert({
    client_account_id: clientAccountId,
    brand_id: brandId,
    file_name: file.name,
    file_url: storagePath,
    storage_path: storagePath,
    uploaded_by_person_id: person?.id ?? null,
    section: safeSection,
  });

  if (insertError) {
    await admin.storage.from('client-files').remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, file_name: file.name });
}
