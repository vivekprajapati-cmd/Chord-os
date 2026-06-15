import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@/lib/supabase/admin';

const CAN_MANAGE = ['admin', 'lead', 'operations'];
const STORAGE_BUCKET = 'briefings';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('access_tier')
    .eq('email', user.email!)
    .maybeSingle();

  if (!CAN_MANAGE.includes((person as any)?.access_tier)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Get the doc to check for file_path
  const { data: doc } = await supabase
    .from('brand_ops_docs')
    .select('file_path')
    .eq('id', id)
    .maybeSingle();

  // Delete file from storage if exists
  if (doc?.file_path) {
    const admin = createAdmin();
    await admin.storage.from(STORAGE_BUCKET).remove([doc.file_path]);
  }

  const { error } = await supabase.from('brand_ops_docs').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
