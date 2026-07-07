import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export default async function ClientFilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/client/login');

  const { data: clientAccount } = await supabase
    .from('client_accounts')
    .select('id, brand_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!clientAccount) redirect('/client/login');

  const admin = createAdminClient();
  const { data: files } = await admin
    .from('client_files')
    .select('id, file_name, storage_path, file_url, created_at')
    .eq('client_account_id', clientAccount.id)
    .order('created_at', { ascending: false });

  // Generate signed URLs (1 hour expiry) for each file
  const signedFiles = await Promise.all(
    (files ?? []).map(async (file) => {
      const path = file.storage_path ?? file.file_url;
      // file_url on old records may be a full public URL — skip signing if no storage_path
      if (!file.storage_path) return { ...file, signedUrl: file.file_url };
      const { data } = await admin.storage
        .from('client-files')
        .createSignedUrl(path, 3600);
      return { ...file, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '44px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '4px' }}>
        Files
      </h1>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '32px' }}>
        Documents, presentations & invoices shared by your team
      </p>

      {signedFiles.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>No files shared yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {signedFiles.map(file => {
            const uploadedDate = new Date(file.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
            });
            const ext = file.file_name.split('.').pop()?.toUpperCase() ?? 'FILE';

            return (
              <a
                key={file.id}
                href={file.signedUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px',
                  padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px', background: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', color: 'var(--cream)', letterSpacing: '0.04em' }}>{ext}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>{uploadedDate}</p>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cobalt)', flexShrink: 0, marginLeft: '16px' }}>
                  Download →
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
