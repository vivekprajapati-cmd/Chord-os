'use client';

import { useState } from 'react';

export default function OperationsClient({
  initialUrl,
  isAdmin,
}: {
  initialUrl: string;
  isAdmin: boolean;
}) {
  const [embedUrl, setEmbedUrl] = useState(initialUrl);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/operations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: draft }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to save.'); setSaving(false); return; }
    setEmbedUrl(draft.trim());
    setEditing(false);
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>
            Operations
          </p>
          <h1 className="font-display text-5xl uppercase tracking-tight">Ops Hub</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {embedUrl && (
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 16px', textDecoration: 'none' }}
            >
              ↗ Open in new tab
            </a>
          )}
          {isAdmin && !editing && (
            <button
              onClick={() => { setDraft(embedUrl); setEditing(true); }}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px', cursor: 'pointer' }}
            >
              {embedUrl ? 'Edit URL' : '+ Set URL'}
            </button>
          )}
        </div>
      </div>

      {/* Edit URL panel — admin only */}
      {isAdmin && editing && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
            Embed URL — paste a Google Sheets (published), Airtable, Coda, or Excel Online link
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="url"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              autoFocus
              style={{ flex: 1, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontFamily: 'var(--f-mono)', outline: 'none' }}
            />
            <button
              onClick={save}
              disabled={saving || !draft.trim()}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px 18px', cursor: saving || !draft.trim() ? 'not-allowed' : 'pointer', opacity: saving || !draft.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
            Google Sheets: File → Share → Publish to web → select sheet → Publish → copy the link.
          </p>
        </div>
      )}

      {/* Embed */}
      {embedUrl ? (
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--paper)' }}>
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: '500px', border: 'none', display: 'block' }}
            title="Operations Hub"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      ) : (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '80px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: '28px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>
            Nothing here yet
          </p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>
            {isAdmin ? 'Set a URL above to embed your ops tracker.' : 'Ask your admin to set the operations link.'}
          </p>
        </div>
      )}
    </div>
  );
}
