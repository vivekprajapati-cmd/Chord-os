'use client';

import { useState } from 'react';
import Link from 'next/link';
import EditProfileModal from './edit-profile-modal';

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  seniority: string;
  location: string;
};

export default function SidebarUser({ person, tier }: { person: Person; tier: 'admin' | 'lead' | 'operations' | 'staff' | 'viewer' | 'poc' }) {
  const [showEdit, setShowEdit] = useState(false);
  const [currentPerson, setCurrentPerson] = useState(person);
  const firstName = currentPerson.name?.split(' ')[0] ?? '';

  return (
    <>
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '999px',
            background: 'var(--ink)', color: 'var(--cream)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 600, flexShrink: 0,
            letterSpacing: '0.04em',
          }}>
            {currentPerson.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentPerson.role || currentPerson.department || ''}
            </p>
          </div>
          {tier !== 'staff' && (
            <span style={{ marginLeft: 'auto', flexShrink: 0, fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '2px 8px', color: 'var(--ink)' }}>
              {tier === 'admin' ? 'Lead' : 'POC'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowEdit(true)}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Edit profile
          </button>
          <span style={{ color: 'var(--line)', fontSize: '10px' }}>·</span>
          <Link
            href="/api/auth/logout"
            prefetch={false}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', textDecoration: 'none' }}
          >
            Sign out
          </Link>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal
          person={currentPerson}
          onClose={() => setShowEdit(false)}
          onSaved={updated => setCurrentPerson(updated)}
        />
      )}
    </>
  );
}
