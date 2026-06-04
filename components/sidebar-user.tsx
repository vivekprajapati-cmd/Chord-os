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

export default function SidebarUser({ person, tier }: { person: Person; tier: 'admin' | 'poc' | 'staff' }) {
  const [showEdit, setShowEdit] = useState(false);
  const [currentPerson, setCurrentPerson] = useState(person);
  const firstName = currentPerson.name?.split(' ')[0] ?? '';

  return (
    <>
      <div className="px-5 py-5" style={{ borderTop: '1px solid var(--line)' }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--ink)', fontWeight: 500 }}>{firstName}</p>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
          {currentPerson.role || currentPerson.department || ''}
        </p>
        {tier !== 'staff' && (
          <span style={{ display: 'inline-block', marginTop: '8px', fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '2px 8px', color: 'var(--ink)' }}>
            {tier === 'admin' ? 'Lead' : 'POC'}
          </span>
        )}
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
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
