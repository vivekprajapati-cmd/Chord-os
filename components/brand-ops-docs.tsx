'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

type Brand = { id: string; name: string; slug: string };

type OpsDoc = {
  id: string;
  brand_id: string;
  doc_type: 'orm_report' | 'review_deck' | 'weekly_tracker';
  month: string;
  week: number;
  link: string | null;
  file_path: string | null;
  created_at: string;
  brands: { id: string; name: string; slug: string } | null;
  uploaded_by: { name: string } | null;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  orm_report: 'ORM Report',
  review_deck: 'Review Deck',
  weekly_tracker: 'Weekly Tracker',
};

const DOC_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  orm_report:     { bg: 'rgba(255,107,74,0.12)',  color: '#c94a2a' },
  review_deck:    { bg: 'rgba(34,38,217,0.10)',   color: '#2226D9' },
  weekly_tracker: { bg: 'rgba(60,180,100,0.12)',  color: '#1a7a40' },
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i); // 2025–2035

function monthLabel(m: string) {
  const [year, month] = m.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

function MonthYearPicker({
  value,
  onChange,
  style,
}: {
  value: string; // YYYY-MM
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  const [year, mon] = value ? value.split('-') : ['', ''];
  const sel: React.CSSProperties = {
    fontFamily: 'var(--f-mono)', fontSize: '11px',
    background: 'var(--paper)', border: '1px solid var(--line)',
    borderRadius: '8px', padding: '6px 10px',
    color: 'var(--ink)', cursor: 'pointer', outline: 'none',
    ...style,
  };
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <select
        value={mon}
        onChange={e => {
          if (!e.target.value) { onChange(''); return; }
          onChange(`${year || new Date().getFullYear()}-${e.target.value}`);
        }}
        style={sel}
      >
        <option value=''>All Months</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      {mon && (
        <select
          value={year}
          onChange={e => onChange(`${e.target.value}-${mon}`)}
          style={sel}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function getBrandInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

const ACCEPTED = '.pdf,.xlsx,.xls,.pptx,.ppt,.docx,.doc';

export default function BrandOpsDocs({
  brands,
  initialDocs,
  canManage,
  currentPersonId,
}: {
  brands: Brand[];
  initialDocs: OpsDoc[];
  canManage: boolean;
  currentPersonId: string;
}) {
  const supabase = createClient();
  const [docs, setDocs] = useState<OpsDoc[]>(initialDocs);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const currentMonth = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, '0')}`;
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterWeek, setFilterWeek] = useState('');

  // Modal form
  const [form, setForm] = useState({
    brand_id: brands[0]?.id ?? '',
    doc_type: 'orm_report',
    month: currentMonth,
    week: '1',
    link: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = docs.filter(d => {
    if (filterBrand && d.brand_id !== filterBrand) return false;
    if (filterType && d.doc_type !== filterType) return false;
    if (filterMonth && d.month !== filterMonth) return false;
    if (filterWeek && d.week !== parseInt(filterWeek)) return false;
    return true;
  });

  async function handleOpen(doc: OpsDoc) {
    if (doc.link) { window.open(doc.link, '_blank'); return; }
    if (doc.file_path) {
      const { data } = await supabase.storage.from('briefings').createSignedUrl(doc.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    }
  }

  async function handleDelete(doc: OpsDoc) {
    if (!confirm('Delete this document?')) return;
    if (doc.file_path) {
      await supabase.storage.from('briefings').remove([doc.file_path]);
    }
    const res = await fetch(`/api/ops-docs/${doc.id}`, { method: 'DELETE' });
    if (res.ok) setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  async function handleSave() {
    if (!form.brand_id || !form.doc_type || !form.month || !form.week) {
      setError('Fill all fields.'); return;
    }
    if (!form.link && !uploadFile) {
      setError('Provide a link or upload a file.'); return;
    }
    setSaving(true);
    setError('');

    let file_path: string | null = null;

    if (uploadFile) {
      const brand = brands.find(b => b.id === form.brand_id);
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${brand?.slug ?? form.brand_id}/${form.doc_type}/${form.month}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('briefings').upload(path, uploadFile, { upsert: false });
      if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); setSaving(false); return; }
      file_path = path;
    }

    const res = await fetch('/api/ops-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: form.brand_id,
        doc_type: form.doc_type,
        month: form.month,
        week: parseInt(form.week),
        link: form.link || null,
        file_path,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed.'); setSaving(false); return; }

    setDocs(prev => [data as OpsDoc, ...prev]);
    setShowModal(false);
    setForm({ brand_id: brands[0]?.id ?? '', doc_type: 'orm_report', month: currentMonth, week: '1', link: '' });
    setUploadFile(null);
    setSaving(false);
  }

  const sel: React.CSSProperties = { fontFamily: 'var(--f-mono)', fontSize: '11px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px 10px', color: 'var(--ink)', cursor: 'pointer', outline: 'none' };
  const inp: React.CSSProperties = { fontFamily: 'var(--f-mono)', fontSize: '12px', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', width: '100%', outline: 'none', color: 'var(--ink)' };
  const lbl: React.CSSProperties = { fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', display: 'block', marginBottom: '6px' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
          Brand Documents
        </p>
        {canManage && (
          <button
            onClick={() => { setShowModal(true); setError(''); setUploadFile(null); setForm({ brand_id: brands[0]?.id ?? '', doc_type: 'orm_report', month: currentMonth, week: '1', link: '' }); }}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '8px 16px', cursor: 'pointer' }}
          >
            + Add Document
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={sel}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={sel}>
          <option value="">All Types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <MonthYearPicker value={filterMonth} onChange={setFilterMonth} />
        <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} style={sel}>
          <option value="">All Weeks</option>
          {[1,2,3,4,5].map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: '24px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>
            No documents
          </p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>
            {canManage ? 'Add one using the button above.' : 'Documents will appear here once added.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map(doc => {
            const brand = doc.brands;
            const typeStyle = DOC_TYPE_COLORS[doc.doc_type];
            return (
              <div
                key={doc.id}
                style={{ background: 'var(--paper)', border: '1.5px solid var(--line)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '4px 4px 0 var(--line)' }}
              >
                {/* Brand + menu */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                      {brand ? getBrandInitials(brand.name) : '??'}
                    </div>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {brand?.name ?? '—'}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(doc)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', fontSize: '16px', lineHeight: 1, padding: '2px 6px' }}
                      title="Delete"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Doc type badge */}
                <div>
                  <span style={{ ...typeStyle, fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: '999px', display: 'inline-block' }}>
                    {DOC_TYPE_LABELS[doc.doc_type]}
                  </span>
                </div>

                {/* Month + week */}
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--ink)' }}>
                  {monthLabel(doc.month)} &bull; Week {doc.week}
                </p>

                {/* Updated */}
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>&#9679;</span> Updated {timeAgo(doc.created_at)}
                </p>

                {/* Open */}
                <button
                  onClick={() => handleOpen(doc)}
                  style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '999px', padding: '6px 14px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 'auto' }}
                >
                  Open ↗
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Document Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--cream)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Add Document</p>
              <button onClick={() => { setShowModal(false); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--gray)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>Brand</label>
                <select value={form.brand_id} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Document Type</label>
                <select value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Month</label>
                <MonthYearPicker
                  value={form.month}
                  onChange={v => setForm(f => ({ ...f, month: v }))}
                  style={{ background: 'var(--cream)' }}
                />
              </div>
              <div>
                <label style={lbl}>Week</label>
                <select value={form.week} onChange={e => setForm(f => ({ ...f, week: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                  {[1,2,3,4,5].map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>Link</label>
              <input
                type="url"
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="Paste document link here..."
                style={inp}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>

            <div>
              <label style={lbl}>Upload File</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '1.5px dashed var(--line)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: uploadFile ? 'rgba(60,180,100,0.06)' : 'transparent' }}
              >
                {uploadFile ? (
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--ink)' }}>
                    {uploadFile.name}
                    <button onClick={e => { e.stopPropagation(); setUploadFile(null); }} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}>×</button>
                  </p>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)', marginBottom: '4px' }}>Drag & drop or click to browse</p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>PDF, XLSX, PPTX, DOCX · Max 200MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); e.target.value = ''; }} />
            </div>

            {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}

            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
              * Add either a link or upload a file (minimum one required)
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowModal(false); setError(''); }}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px 24px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
