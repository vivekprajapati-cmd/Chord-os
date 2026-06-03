'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

export default function AddPersonModal({ onClose, onAdded }: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Creative');
  const [seniority, setSeniority] = useState('Mid');
  const [location, setLocation] = useState('Mumbai');
  const [isLead, setIsLead] = useState(false);

  async function save() {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!role.trim()) { setError('Role is required.'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('people').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      department,
      seniority,
      location: location.trim() || 'Mumbai',
      is_team_lead: isLead,
    });

    if (err) {
      setError(err.message.includes('unique') ? 'Email already exists.' : err.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onAdded();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '540px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--ink)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>Team</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Add Person</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

          {/* Name + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Vineet Shelar" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="vineet@1702digital.com" style={inputStyle} />
            </div>
          </div>

          {/* Role */}
          <div>
            <label style={labelStyle}>Role / Title</label>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="Video Editor" style={inputStyle} />
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

          {/* Team lead toggle */}
          <div
            onClick={() => setIsLead(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isLead ? 'var(--coral)' : 'var(--paper)',
              border: `1px solid ${isLead ? 'var(--ink)' : 'var(--line)'}`,
              borderRadius: '12px',
              padding: '14px 18px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Team Lead</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '3px' }}>Can use Allocator, see all tasks, approve work</p>
            </div>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px',
              border: '1.5px solid var(--ink)',
              background: isLead ? 'var(--ink)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isLead && <span style={{ color: 'var(--cream)', fontSize: '12px', lineHeight: 1 }}>✓</span>}
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button
            onClick={save}
            disabled={loading}
            style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px 16px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Adding…' : '+ Add to team'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 16px', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
