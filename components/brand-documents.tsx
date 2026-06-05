'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type Document = {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
  uploaded_by: { name: string } | null;
};

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx';

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.includes('pdf')) return '📄';
  if (type.includes('ppt')) return '📊';
  return '📝';
}

export default function BrandDocuments({
  brandId,
  brandSlug,
  initialDocs,
  canUpload,
}: {
  brandId: string;
  brandSlug: string;
  initialDocs: Document[];
  canUpload: boolean;
}) {
  const supabase = createClient();
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (!file) return;
    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `briefings/${brandSlug}/${Date.now()}_${safeName}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('briefings')
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setError(`Upload failed: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const { data: person } = await supabase
      .from('people')
      .select('id, name')
      .eq('email', user?.email ?? '')
      .maybeSingle();

    // Save metadata to brand_documents
    const { data: doc, error: dbErr } = await supabase
      .from('brand_documents')
      .insert({
        brand_id: brandId,
        name: file.name,
        file_path: path,
        file_type: ext,
        file_size: file.size,
        uploaded_by_id: person?.id ?? null,
      })
      .select('id, name, file_path, file_type, file_size, created_at')
      .single();

    if (dbErr || !doc) {
      setError('Saved to storage but failed to record in DB.');
    } else {
      setDocs(prev => [doc as unknown as Document, ...prev]);
    }

    setUploading(false);
  }

  async function handleDelete(doc: Document) {
    await supabase.storage.from('briefings').remove([doc.file_path]);
    await supabase.from('brand_documents').delete().eq('id', doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  async function handleDownload(doc: Document) {
    const { data } = await supabase.storage.from('briefings').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)]">
          Brand documents
        </p>
        {canUpload && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-mono uppercase tracking-[0.12em] px-4 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
              style={{ background: 'var(--ink)', color: 'var(--cream)' }}
            >
              {uploading ? 'Uploading…' : '+ Upload'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>

      {error && (
        <p className="text-xs font-mono text-[var(--red)] mb-3">{error}</p>
      )}

      {docs.length === 0 ? (
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--gray)]">No documents yet.</p>
          {canUpload && (
            <p className="text-xs text-[var(--gray)] mt-1 font-mono">Upload brand briefs, decks, or guidelines.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-[var(--paper)] border border-[var(--line)] rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{fileIcon(doc.file_type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs font-mono text-[var(--gray)]">
                    {doc.file_type.toUpperCase()}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                    {doc.uploaded_by?.name ? ` · ${doc.uploaded_by.name}` : ''}
                    {' · '}{new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--cobalt)] hover:opacity-70 transition"
                >
                  Open
                </button>
                {canUpload && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--red)] hover:opacity-70 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
