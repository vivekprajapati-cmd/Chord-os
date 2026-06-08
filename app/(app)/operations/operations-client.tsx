'use client';

import { useState } from 'react';

type OpsLink = { id: string; title: string; url: string; sort_order: number };

export default function OperationsClient({
  initialLinks,
  isAdmin,
}: {
  initialLinks: OpsLink[];
  isAdmin: boolean;
}) {
  const [links, setLinks] = useState<OpsLink[]>(initialLinks);
  const [activeId, setActiveId] = useState<string>(initialLinks[0]?.id ?? '');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const activeLink = links.find(l => l.id === activeId) ?? null;

  async function addLink() {
    if (!addTitle.trim() || !addUrl.trim()) return;
    setAdding(true);
    setError('');
    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: addTitle, url: addUrl }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed.'); setAdding(false); return; }
    const newLink = data as OpsLink;
    setLinks(prev => [...prev, newLink]);
    setActiveId(newLink.id);
    setAddTitle('');
    setAddUrl('');
    setShowAdd(false);
    setAdding(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError('');
    const res = await fetch('/api/operations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: editTitle, url: editUrl }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed.'); setSaving(false); return; }
    setLinks(prev => prev.map(l => l.id === id ? { ...l, title: editTitle, url: editUrl } : l));
    setEditingId(null);
    setSaving(false);
  }

  async function deleteLink(id: string) {
    if (!confirm('Remove this link?')) return;
    const res = await fetch('/api/operations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const remaining = links.filter(l => l.id !== id);
    setLinks(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? '');
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
          {activeLink && (
            <a
              href={activeLink.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 16px', textDecoration: 'none' }}
            >
              ↗ Open in new tab
            </a>
          )}
          {isAdmin && (
            <button
              onClick={() => { setShowAdd(s => !s); setError(''); }}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px', cursor: 'pointer' }}
            >
              + Add link
            </button>
          )}
        </div>
      </div>

      {/* Add link form — admin only */}
      {isAdmin && showAdd && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
            New link — Google Sheets (published), Airtable, Coda, Excel Online
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              placeholder="Label (e.g. Ops Tracker)"
              autoFocus
              style={{ width: '180px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
            />
            <input
              type="url"
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              placeholder="https://..."
              style={{ flex: 1, minWidth: '200px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontFamily: 'var(--f-mono)', outline: 'none' }}
            />
            <button
              onClick={addLink}
              disabled={adding || !addTitle.trim() || !addUrl.trim()}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px 18px', cursor: adding || !addTitle.trim() || !addUrl.trim() ? 'not-allowed' : 'pointer', opacity: adding || !addTitle.trim() || !addUrl.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddTitle(''); setAddUrl(''); }}
              style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', background: 'transparent', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
            Google Sheets: File → Share → Publish to web → Publish → copy link.
          </p>
        </div>
      )}

      {links.length > 0 ? (
        <>
          {/* Tab strip */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {links.map(link => (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {editingId === link.id ? (
                  /* Inline edit */
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--ink)', borderRadius: '10px', padding: '4px 8px' }}>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{ width: '100px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--f-mono)', fontSize: '11px' }}
                      autoFocus
                    />
                    <input
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      style={{ width: '180px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--f-mono)', fontSize: '11px' }}
                      placeholder="URL"
                    />
                    <button
                      onClick={() => saveEdit(link.id)}
                      disabled={saving}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'transparent', border: 'none', color: 'var(--gray)', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveId(link.id)}
                      style={{
                        fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
                        padding: '7px 14px', borderRadius: '999px', cursor: 'pointer', transition: 'all 0.15s',
                        background: activeId === link.id ? 'var(--ink)' : 'var(--paper)',
                        color: activeId === link.id ? 'var(--cream)' : 'var(--ink)',
                        border: `1px solid ${activeId === link.id ? 'var(--ink)' : 'var(--line)'}`,
                      }}
                    >
                      {link.title}
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditingId(link.id); setEditTitle(link.title); setEditUrl(link.url); }}
                          title="Edit"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', padding: '4px', lineHeight: 1 }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          title="Remove"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', padding: '4px', lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Embed */}
          {activeLink && (
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--paper)' }}>
              <iframe
                key={activeLink.id}
                src={activeLink.url}
                style={{ width: '100%', height: 'calc(100vh - 300px)', minHeight: '500px', border: 'none', display: 'block' }}
                title={activeLink.title}
                allow="clipboard-read; clipboard-write"
              />
            </div>
          )}
        </>
      ) : (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '80px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: '28px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>
            Nothing here yet
          </p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>
            {isAdmin ? 'Add a link above to get started.' : 'Ask your admin to add an operations link.'}
          </p>
        </div>
      )}
    </div>
  );
}
