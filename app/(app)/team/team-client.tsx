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
  default_hours_per_day?: number;
};

type BlockInfo = {
  person_id: string;
  start_at: string;
  end_at: string;
  status: string;
  tasks?: { id: string; deliverable: string; estimated_hours: number; brands?: { name: string } } | null;
};

type CapacityEntry = { blocked: number; blocks: BlockInfo[] };

const DEPT_ORDER = ['Leadership', 'Ops', 'Account', 'Creative', 'Video', 'SEO', 'Content', 'Sales', 'Marketing'];

export default function TeamClient({ people: initialPeople, capacityMap = {} }: { people: Person[]; capacityMap?: Record<string, CapacityEntry> }) {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
              {members.map(person => {
                const cap = capacityMap[person.id];
                const totalHours = person.default_hours_per_day ?? 9;
                const blockedHours = cap?.blocked ?? 0;
                const remainingHours = Math.max(0, totalHours - blockedHours);
                const pct = Math.min(100, Math.round((blockedHours / totalHours) * 100));
                const isExpanded = expandedId === person.id;
                const isOverloaded = blockedHours >= totalHours;

                return (
                  <div key={person.id} className="bg-[var(--paper)] border border-[var(--line)] rounded-xl overflow-hidden">
                    {/* Main row */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--cream)] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : person.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{person.name}</p>
                          {person.is_team_lead && (
                            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '1px 7px', color: 'var(--ink)' }}>
                              Lead
                            </span>
                          )}
                        </div>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginBottom: '8px' }}>
                          {person.role}
                        </p>
                        {/* Capacity bar */}
                        <div className="flex items-center gap-3">
                          <div style={{ width: '100px', height: '3px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: isOverloaded ? 'var(--coral)' : 'var(--cobalt)', borderRadius: '999px', transition: 'width 0.3s' }} />
                          </div>
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: isOverloaded ? 'var(--coral)' : 'var(--gray)' }}>
                            {Math.round(blockedHours * 10) / 10}h blocked · {Math.round(remainingHours * 10) / 10}h free
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <a
                          href={`mailto:${person.email}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--cobalt)', textDecoration: 'none' }}
                        >
                          {person.email}
                        </a>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded blocks */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', background: 'var(--cream)' }}>
                        {!cap || cap.blocks.length === 0 ? (
                          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>No blocks today.</p>
                        ) : (
                          <div className="space-y-2">
                            {cap.blocks.map((b, i) => {
                              const start = new Date(b.start_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
                              const end = new Date(b.end_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
                              return (
                                <div key={i} className="flex items-center justify-between">
                                  <div>
                                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{b.tasks?.deliverable ?? 'Unnamed task'}</p>
                                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>
                                      {b.tasks?.brands?.name ?? ''} · {start} – {end} IST · {b.tasks?.estimated_hours ?? 0}h
                                    </p>
                                  </div>
                                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--gray)', border: '1px solid var(--line)', borderRadius: '999px', padding: '2px 8px' }}>
                                    {b.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
