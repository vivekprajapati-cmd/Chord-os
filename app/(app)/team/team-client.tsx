'use client';

import { useState } from 'react';
import AddPersonModal from '@/components/add-person-modal';

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  seniority: string;
  location: string;
  is_team_lead: boolean;
};

const DEPT_ORDER = ['Leadership', 'Ops', 'Account', 'Creative', 'Video', 'SEO', 'Content', 'Sales', 'Marketing'];

export default function TeamClient({ people: initialPeople }: { people: Person[] }) {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [showAdd, setShowAdd] = useState(false);

  function handleAdded() {
    // Reload to pull fresh list from server
    window.location.reload();
  }

  // Group by department in order
  const grouped = DEPT_ORDER.reduce<Record<string, Person[]>>((acc, dept) => {
    const members = people.filter(p => p.department === dept);
    if (members.length) acc[dept] = members;
    return acc;
  }, {});

  // Any dept not in DEPT_ORDER
  people.forEach(p => {
    if (!DEPT_ORDER.includes(p.department)) {
      if (!grouped[p.department]) grouped[p.department] = [];
      if (!grouped[p.department].find(m => m.id === p.id)) grouped[p.department].push(p);
    }
  });

  return (
    <>
      <div className="space-y-10">
        <div className="flex items-end justify-between">
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>
              {people.length} people
            </p>
            <h1 className="font-display text-5xl uppercase tracking-tight">Team</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'var(--ink)',
              color: 'var(--cream)',
              border: '1px solid var(--ink)',
              borderRadius: '999px',
              padding: '10px 20px',
              cursor: 'pointer',
              boxShadow: '3px 3px 0 var(--ink)',
            }}
          >
            + Add Person
          </button>
        </div>

        {Object.entries(grouped).map(([dept, members]) => (
          <section key={dept}>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gray)', marginBottom: '10px' }}>
              {dept} ({members.length})
            </p>
            <div className="space-y-2">
              {members.map(person => (
                <div
                  key={person.id}
                  className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{person.name}</p>
                      {person.is_team_lead && (
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '1px 7px', color: 'var(--ink)' }}>
                          Lead
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '3px' }}>
                      {person.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                      {person.seniority}
                    </p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                      {person.location}
                    </p>
                    <a
                      href={`mailto:${person.email}`}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--cobalt)', textDecoration: 'none' }}
                    >
                      {person.email}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showAdd && (
        <AddPersonModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}
