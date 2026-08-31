'use client';

import { useEffect, useState } from 'react';

type Brand = { id: string; name: string };
type Person = { id: string; name: string };
type Assignment = { brand_id: string; role_type?: string; brands: { name: string } };

type Props = {
  people: Person[];
  defaultPersonId: string;
  onClose: () => void;
  onSaved: (personId: string) => void;
};

const ROLE_TYPES = ['social', 'influencer', 'creative'] as const;

function BrandAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#e0f2fe', '#fce7f3', '#f0fdf4', '#fef9c3', '#ede9fe', '#ffedd5'];
  const textColors = ['#0369a1', '#9d174d', '#15803d', '#a16207', '#6d28d9', '#c2410c'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: textColors[idx], flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function AssignModal({ people, defaultPersonId, onClose, onSaved }: Props) {
  const [selectedPersonId, setSelectedPersonId] = useState(defaultPersonId);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roleType, setRoleType] = useState<'social' | 'influencer' | 'creative'>('social');
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/harmony-core/assignments')
      .then(r => r.json())
      .then(d => { setBrands(d.brands ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch(`/api/harmony-core?person_id=${selectedPersonId}&month=${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`)
      .then(r => r.json())
      .then(d => setAssignments(d.assignments ?? []));
  }, [selectedPersonId]);

  const assignedIds = new Set(assignments.map((a: any) => a.brand_id));

  async function toggle(brandId: string, isAssigned: boolean) {
    setSaving(brandId);
    await fetch('/api/harmony-core/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_id: selectedPersonId,
        brand_id: brandId,
        role_type: roleType,
        action: isAssigned ? 'unassign' : 'assign',
      }),
    });
    const d = await fetch(`/api/harmony-core?person_id=${selectedPersonId}&month=${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`).then(r => r.json());
    setAssignments(d.assignments ?? []);
    setSaving(null);
    onSaved(selectedPersonId);
  }

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,11,0.4)' }} />

      {/* Panel */}
      <div style={{ position: 'relative', background: '#F0EDE5', border: '1px solid #0D0D0B', borderRadius: '14px', boxShadow: '6px 6px 0 #0D0D0B', width: '520px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #c8c4bc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--coral, #e05c3a)', marginBottom: '4px' }}>Admin</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Assign Brands</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Person selector */}
          <div>
            <label style={labelStyle}>Person</label>
            <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} style={selectStyle}>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Role type for new assignments */}
          <div>
            <label style={labelStyle}>Role type (for new assignments)</label>
            <select value={roleType} onChange={e => setRoleType(e.target.value as any)} style={selectStyle}>
              {ROLE_TYPES.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Brand list */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Brands — {assignedIds.size} assigned to {selectedPerson?.name.split(' ')[0]}
            </label>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {brands.map(b => {
                  const isAssigned = assignedIds.has(b.id);
                  const isSaving = saving === b.id;
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${isAssigned ? 'var(--ink)' : 'var(--border)'}`, background: isAssigned ? 'rgba(13,13,11,0.04)' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BrandAvatar name={b.name} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{b.name}</span>
                        {isAssigned && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--coral, #e05c3a)', letterSpacing: '0.05em' }}>
                            {assignments.find((a: any) => a.brand_id === b.id)?.role_type ?? ''}
                          </span>
                        )}
                      </div>
                      <button onClick={() => toggle(b.id, isAssigned)} disabled={!!saving}
                        style={{ padding: '5px 14px', borderRadius: '999px', border: `1px solid ${isAssigned ? '#dc2626' : 'var(--ink)'}`, background: isAssigned ? '#fee2e2' : 'var(--ink)', color: isAssigned ? '#dc2626' : '#F0EDE5', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', letterSpacing: '0.04em' }}>
                        {isSaving ? '…' : isAssigned ? 'Remove' : 'Assign'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #c8c4bc', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '999px', border: '1px solid var(--ink)', background: 'var(--ink)', color: '#F0EDE5', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px',
  textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '8px',
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid #c8c4bc', background: '#fff',
  color: '#0D0D0B', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px',
  letterSpacing: '0.04em', cursor: 'pointer',
};
