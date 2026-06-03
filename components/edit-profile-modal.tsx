'use client';

import { useState } from 'react';

const DEPARTMENTS = ['Creative', 'Video', 'Account', 'SEO', 'Content', 'Sales', 'Marketing', 'Ops', 'Leadership'];
const SENIORITIES = ['Exec', 'Lead', 'Senior', 'Mid', 'Junior', 'Trainee', 'Intern'];

const inputStyle = {
  width: '100%',
  background: 'var(--cream)',
  border: '1px solid var(--ink)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit',
} as const;

const labelStyle = {
  fontFamily: 'var(--f-mono)',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--gray)',
  display: 'block',
  marginBottom: '6px',
};

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  seniority: string;
  location: string;
};

export default function EditProfileModal({ person, onClose, onSaved }: {
  person: Person;
  onClose: () => void;
  onSaved: (updated: Person) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(person.name ?? '');
  const [role, setRole] = useState(person.role ?? '');
  const [department, setDepartment] = useState(person.department ?? 'Ops');
  const [seniority, setSeniority] = useState(person.seniority ?? 'Mid');
  const [location, setLocation] = useState(person.location ?? 'Mumbai');

  async function save() {
    if (!name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/people/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), role: role.trim(), department, seniority, location: location.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to save.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved({ ...person, name: name.trim(), role: role.trim(), department, seniority, location: location.trim() });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--coral)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '4px' }}>Account</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '26px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Edit Profile</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Email — read only */}
          <div>
            <label style={labelStyle}>Email (cannot be changed)</label>
            <input value={person.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
          </div>

          {/* Role */}
          <div>
            <label style={labelStyle}>Role / Title</label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Art Director" style={inputStyle} />
          </div>

          {/* Department + Seniority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Seniority</label>
              <select value={seniority} onChange={e => setSeniority(e.target.value)} style={inputStyle}>
                {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Mumbai" style={inputStyle} />
          </div>

          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button
            onClick={save}
            disabled={loading}
            style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 20px', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
