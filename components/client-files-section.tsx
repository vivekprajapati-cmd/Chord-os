'use client';

import { useState, useRef } from 'react';

const FILE_SECTIONS = ['Brand Identity', 'Finance', 'Reports', 'Contracts', 'Creatives', 'General'] as const;
type FileSection = (typeof FILE_SECTIONS)[number];

type ClientAccount = { id: string; email: string };
type ClientFile = { id: string; file_name: string; file_url: string; created_at: string; section?: string };

export default function ClientFilesSection({
  brandId,
  clientAccounts,
  initialFiles,
}: {
  brandId: string;
  clientAccounts: ClientAccount[];
  initialFiles: Record<string, ClientFile[]>;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedAccountId, setSelectedAccountId] = useState(clientAccounts[0]?.id ?? '');
  const [selectedSection, setSelectedSection] = useState<FileSection>('General');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (clientAccounts.length === 0) {
    return (
      <div>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
          Client Files
        </p>
        <p style={{ fontSize: '13px', color: 'var(--gray)' }}>No client logins created for this brand yet.</p>
      </div>
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;
    setError('');
    setUploading(true);

    const form = new FormData();
    form.append('file', file);
    form.append('client_account_id', selectedAccountId);
    form.append('brand_id', brandId);
    form.append('section', selectedSection);

    const res = await fetch('/api/client/files', { method: 'POST', body: form });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? 'Upload failed.');
      return;
    }

    // Refresh file list for this account
    const refreshRes = await fetch(`/api/client/files?client_account_id=${selectedAccountId}`);
    if (refreshRes.ok) {
      const refreshed = await refreshRes.json();
      setFiles(prev => ({ ...prev, [selectedAccountId]: refreshed.files }));
    }

    if (fileRef.current) fileRef.current.value = '';
  }

  const currentFiles = files[selectedAccountId] ?? [];

  return (
    <div>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '12px' }}>
        Client Files
      </p>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Controls */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', background: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '10px', padding: '8px 12px', outline: 'none' }}
          >
            {clientAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.email}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value as FileSection)}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', background: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '10px', padding: '8px 12px', outline: 'none' }}
          >
            {FILE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={{
            fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
            background: uploading ? 'var(--gray)' : 'var(--ink)', color: 'var(--cream)',
            border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px',
            cursor: uploading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
          }}>
            {uploading ? 'Uploading…' : '+ Upload File'}
            <input ref={fileRef} type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
          </label>

          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}
        </div>

        {/* File list */}
        {currentFiles.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No files uploaded for this client yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentFiles.map((f, i) => {
              const date = new Date(f.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
              });
              const isLast = i === currentFiles.length - 1;
              return (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', borderBottom: isLast ? 'none' : '1px solid var(--line)',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{f.file_name}</p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>{date}</p>
                  </div>
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cobalt)', textDecoration: 'none' }}
                  >
                    Open →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
