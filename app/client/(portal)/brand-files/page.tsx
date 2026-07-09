import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import BrandFilesClient from './brand-files-client';
import { FILE_SECTIONS, type FileSection } from './sections';

export default async function BrandFilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount || !clientAccount.is_active) redirect('/client/login');

  const admin = createAdminClient();

  const [brandResult, filesResult] = await Promise.all([
    admin
      .from('brands')
      .select('name, colors, typography, voice_summary')
      .eq('id', clientAccount.brand_id)
      .maybeSingle(),
    admin
      .from('client_files')
      .select('id, file_name, storage_path, file_url, created_at, section')
      .eq('client_account_id', clientAccount.id)
      .order('created_at', { ascending: false }),
  ]);

  const brand = brandResult.data;
  const rawFiles = filesResult.data ?? [];

  // Generate signed URLs
  const files = await Promise.all(
    rawFiles.map(async (f) => {
      if (!f.storage_path) return { ...f, signedUrl: f.file_url, section: (f.section ?? 'General') as FileSection };
      const { data } = await admin.storage.from('client-files').createSignedUrl(f.storage_path, 3600);
      return { ...f, signedUrl: data?.signedUrl ?? null, section: (f.section ?? 'General') as FileSection };
    })
  );

  const colors = (brand?.colors ?? {}) as Record<string, string>;
  const typography = (brand?.typography ?? {}) as Record<string, string>;

  return (
    <BrandFilesClient
      brandName={brand?.name ?? ''}
      colors={colors}
      typography={typography}
      voiceSummary={brand?.voice_summary ?? null}
      files={files}
    />
  );
}
