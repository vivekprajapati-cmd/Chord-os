'use client';

import { useState } from 'react';

const DEPARTMENTS = ['Creative', 'Video', 'Account', 'SEO', 'Content', 'Sales', 'Marketing', 'Ops', 'Leadership'];
const SENIORITIES = ['Exec', 'Lead', 'Senior', 'Mid', 'Junior', 'Trainee', 'Intern'];

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  seniority: string;
  location: string;
  access_tier: string;
};

type Tab = 'leave' | 'feedback';

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--ink)', color: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--f-mono)', fontSize: size * 0.25, fontWeight: 600,
      letterSpacing: '0.04em', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Field({ label, value, editing, type = 'text', options, onChange }: {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  options?: string[];
  onChange: (v: string) => void;
}) {
  const base: React.CSSProperties = {
    fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--ink)',
    background: editing ? 'var(--paper, #fafaf8)' : 'transparent',
    border: editing ? '1px solid var(--ink)' : '1px solid transparent',
    borderRadius: '8px', padding: '8px 10px', width: '100%', outline: 'none',
    transition: 'border-color 0.15s',
  };
  return (
    <div>
      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '4px' }}>{label}</p>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} disabled={!editing} style={{ ...base, cursor: editing ? 'pointer' : 'default', appearance: editing ? 'auto' : 'none' }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={!editing} style={{ ...base, cursor: editing ? 'text' : 'default' }} />
      )}
    </div>
  );
}

function ComingSoonBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', background: 'color-mix(in srgb, var(--coral) 12%, var(--cream))', border: '1px solid var(--coral)', borderRadius: '999px', padding: '4px 14px' }}>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--coral)' }}>Coming Soon</span>
    </div>
  );
}

export default function ProfileClient({ person: initial, managerName }: { person: Person; managerName: string | null }) {
  const [person, setPerson] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('leave');

  function setField(field: keyof Person, value: string) {
    setDraft(p => ({ ...p, [field]: value }));
  }

  async function save() {
    if (!draft.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/people/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draft.name, role: draft.role, department: draft.department, seniority: draft.seniority, location: draft.location }),
    });
    setSaving(false);
    if (!res.ok) { setError('Failed to save.'); return; }
    setPerson(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(person);
    setEditing(false);
    setError('');
  }

  const tierLabel = (t: string) => {
    if (t === 'admin') return 'Admin';
    if (t === 'lead') return 'Lead';
    if (t === 'operations') return 'Operations';
    if (t === 'viewer') return 'Viewer';
    return 'Staff';
  };

  return (
    <div style={{ width: '100%', padding: '0 0 60px' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '6px' }}>Account</p>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--ink)' }}>My Profile</h1>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--gray)', marginTop: '4px' }}>View and manage your personal information, leave balance and feedback.</p>
        </div>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', border: '1.5px dashed var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35,
        }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>

      {/* Profile Card */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '16px', boxShadow: '6px 6px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '24px 28px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar name={person.name} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '22px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)' }}>{person.name}</h2>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '2px 10px', color: 'var(--ink)' }}>
                {tierLabel(person.access_tier)}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginBottom: '2px' }}>{person.role || '—'}</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5" /><circle cx="12" cy="7" r="4" /></svg>
                {person.department || '—'}
              </span>
            </div>
          </div>

          {/* Manager section */}
          {managerName && (
            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '24px', minWidth: '160px' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '6px' }}>Manager</p>
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{managerName.split('·')[0].trim()}</p>
              {managerName.includes('·') && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>{managerName.split('·')[1]?.trim()}</p>}
            </div>
          )}
        </div>

        {/* Editable Fields */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)' }}>Personal Details</p>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--line)', borderRadius: '999px', padding: '5px 14px', color: 'var(--ink)', cursor: 'pointer' }}>
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={cancel} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--line)', borderRadius: '999px', padding: '5px 14px', color: 'var(--gray)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={save} disabled={saving} style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '5px 14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {/* Email readonly */}
            <div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '4px' }}>Email</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)', padding: '8px 0' }}>{person.email}</p>
            </div>

            <Field label="Full Name" value={draft.name} editing={editing} onChange={v => setField('name', v)} />
            <Field label="Role / Title" value={draft.role} editing={editing} onChange={v => setField('role', v)} />
            <Field label="Department" value={draft.department} editing={editing} options={DEPARTMENTS} onChange={v => setField('department', v)} />
            <Field label="Seniority" value={draft.seniority} editing={editing} options={SENIORITIES} onChange={v => setField('seniority', v)} />
            <Field label="Location" value={draft.location} editing={editing} onChange={v => setField('location', v)} />
          </div>

          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red, #e53e3e)', marginTop: '12px' }}>{error}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1.5px solid var(--line)', display: 'flex', gap: '0', marginBottom: '24px' }}>
        {(['leave', 'feedback'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
              color: tab === t ? 'var(--ink)' : 'var(--gray)',
              marginBottom: '-1.5px', fontWeight: tab === t ? 600 : 400,
              transition: 'color 0.15s',
            }}
          >
            {t === 'leave' ? 'My Leave' : 'My Feedback'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'feedback' && <FeedbackTab />}
    </div>
  );
}

function LeaveTab() {
  const types = [
    { label: 'Earned Leave', used: 0, total: 18, colorVar: 'var(--cobalt)', bgVar: 'color-mix(in srgb, var(--cobalt) 8%, var(--cream))' },
    { label: 'Casual Leave', used: 0, total: 8,  colorVar: 'var(--ink)',    bgVar: 'color-mix(in srgb, var(--ink) 5%, var(--cream))' },
    { label: 'Sick Leave',   used: 0, total: 6,  colorVar: 'var(--coral)',  bgVar: 'color-mix(in srgb, var(--coral) 10%, var(--cream))' },
    { label: 'Unpaid Leave', used: 0, total: 5,  colorVar: 'var(--red)',    bgVar: 'color-mix(in srgb, var(--red) 8%, var(--cream))' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Leave Balance card */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '16px', boxShadow: '6px 6px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>Leave Balance</span>
          </div>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance as of today</span>
        </div>

        {/* Two-column: cards left, apply panel right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '0' }}>
          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', borderRight: '1px solid var(--line)' }}>
            {types.map(t => (
              <div key={t.label} style={{ background: t.bgVar, borderRadius: '12px', padding: '16px 18px', border: '1px solid var(--line)' }}>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.07em', color: t.colorVar, marginBottom: '10px' }}>{t.label}</p>
                <p style={{ fontFamily: 'var(--f-display)', fontSize: '26px', color: 'var(--ink)', fontWeight: 400, lineHeight: 1 }}>
                  {t.used} <span style={{ fontSize: '12px', color: 'var(--gray)', fontFamily: 'var(--f-mono)' }}>/ {t.total} days</span>
                </p>
                <div style={{ marginTop: '12px', height: '3px', borderRadius: '4px', background: 'var(--line)' }}>
                  <div style={{ height: '3px', borderRadius: '4px', background: t.colorVar, width: t.used > 0 ? `${Math.round((t.used / t.total) * 100)}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Apply for Leave panel */}
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--f-display)', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: '6px' }}>Apply for Leave</p>
              <p style={{ fontFamily: 'var(--f-body)', fontSize: '12px', color: 'var(--gray)', lineHeight: 1.5 }}>Need time off? Submit a leave request and get it approved by your manager.</p>
            </div>
            <button
              disabled
              style={{ marginTop: '4px', width: '100%', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '999px', padding: '10px 16px', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'not-allowed', opacity: 0.5 }}
            >
              + Apply for Leave
            </button>
            <ComingSoonBadge />
          </div>
        </div>
      </div>

      {/* Leave History placeholder */}
      <div style={{ border: '1.5px solid var(--ink)', borderRadius: '16px', boxShadow: '6px 6px 0 var(--ink)', background: 'var(--cream)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)', fontWeight: 600 }}>Leave History</span>
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--gray)' }}>Your leave history will appear here once the feature launches.</p>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  return (
    <div style={{ border: '1.5px dashed var(--line)', borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" strokeWidth="1.5"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" /></svg>
      </div>
      <p style={{ fontFamily: 'var(--f-display)', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: '8px' }}>Peer Feedback</p>
      <p style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--gray)', maxWidth: '340px', margin: '0 auto' }}>Internal feedback from your team will appear here. Feature coming soon.</p>
    </div>
  );
}
