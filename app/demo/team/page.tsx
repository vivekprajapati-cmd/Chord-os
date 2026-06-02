'use client';

import { useState } from 'react';
import { MOCK_PEOPLE } from '@/lib/mock-data';

type Person = {
  id: string;
  name: string;
  department: string;
  role?: string;
  seniority?: string;
  location?: string;
  email?: string;
  is_team_lead?: boolean;
};

const MOCK_TEAM: Person[] = [
  { id: 'p-darshit',  name: 'Darshit Raut',       department: 'Ops',        role: 'Founders Office',                   seniority: 'Lead',   location: 'Mumbai',     email: 'darshit@ampmnetwork.com',              is_team_lead: true },
  { id: 'p-shivangi', name: 'Shivangi Shekhar',    department: 'Leadership', role: 'Chief of Creative and Strategy',    seniority: 'Exec',   location: 'Mumbai',     email: 'shivangi.shekhar@1702digital.com',     is_team_lead: true },
  { id: 'p-trupti',   name: 'Trupti Maidh',        department: 'Account',    role: 'Account Lead',                      seniority: 'Lead',   location: 'Mumbai',     email: 'trupti.maidh@1702digital.com',         is_team_lead: true },
  { id: 'p-pierre',   name: 'Pierre Santos',        department: 'Creative',   role: 'Sr. ACD',                           seniority: 'Senior', location: 'Mumbai',     email: 'pierre@1702digital.com',               is_team_lead: true },
  { id: 'p-pratik',   name: 'Pratik Kshirsagar',   department: 'Creative',   role: 'Art Director',                      seniority: 'Senior', location: 'Mumbai',     email: 'pratik.kshirsagar@1702digital.com',    is_team_lead: true },
  { id: 'p-manan',    name: 'Manan Shah',           department: 'Creative',   role: 'Copywriter',                        seniority: 'Mid',    location: 'Mumbai',     email: 'manan.shah@1702digital.com',           is_team_lead: false },
  { id: 'p-kuldip',   name: 'Kuldip Mankar',        department: 'Creative',   role: 'AI Motion Graphic',                 seniority: 'Mid',    location: 'Mumbai',     email: 'kuldipmankarr@gmail.com',              is_team_lead: false },
  { id: 'p-yashika',  name: 'Yashika Mistry',       department: 'Creative',   role: 'Jr. Graphic Designer',              seniority: 'Junior', location: 'Mumbai',     email: 'yashika.mistry@1702digital.com',       is_team_lead: false },
  { id: 'p-nimesh',   name: 'Nimesh Shinde',        department: 'Video',      role: 'Video Lead',                        seniority: 'Lead',   location: 'Mumbai',     email: 'nimesh.shinde@1702digital.com',        is_team_lead: true },
  { id: 'p-vineet',   name: 'Vineet Shelar',        department: 'Video',      role: 'Video Editor',                      seniority: 'Mid',    location: 'Mumbai',     email: 'vineet@1702digital.com',               is_team_lead: false },
  { id: 'p-tarun',    name: 'Tarun',                department: 'Video',      role: 'Video Editor',                      seniority: 'Mid',    location: 'Ahmedabad',  email: 'tarun@1702digital.com',                is_team_lead: false },
  { id: 'p-aman',     name: 'Aman Adodra',          department: 'SEO',        role: 'SEO Business Head',                 seniority: 'Lead',   location: 'Mumbai',     email: 'aman@1702digital.com',                 is_team_lead: true },
  { id: 'p-dhwani',   name: 'Dhwani Chhelavda',     department: 'Content',    role: 'Content Creator',                   seniority: 'Mid',    location: 'Ahmedabad',  email: 'dhwani.chhelavda@1702digital.com',     is_team_lead: false },
  { id: 'p-muskaan',  name: 'Muskaan Madnani',      department: 'Sales',      role: 'Brand Solutions Executive',         seniority: 'Mid',    location: 'Mumbai',     email: 'muskaan@1702digital.com',              is_team_lead: false },
  { id: 'p-moksha',   name: 'Moksha Mehta',         department: 'Sales',      role: 'Brand Solutions Executive',         seniority: 'Mid',    location: 'Mumbai',     email: 'moksha@1702digital.com',               is_team_lead: false },
  { id: 'p-shivani',  name: 'Shivani Reshamwala',   department: 'Sales',      role: 'Brand Solutions Executive',         seniority: 'Mid',    location: 'Mumbai',     email: 'shivani.reshamwala@1702digital.com',   is_team_lead: false },
  { id: 'p-rajat',    name: 'Rajat Dey',            department: 'Marketing',  role: 'Marketing and Alliance',            seniority: 'Mid',    location: 'Mumbai',     email: 'rajat@1702digital.com',                is_team_lead: true },
  { id: 'p-shawn',    name: 'Shawn Dsouza',         department: 'Marketing',  role: 'Influencer Marketing Intern',       seniority: 'Intern', location: 'Mumbai',     email: 'shawn@1702digital.com',                is_team_lead: false },
  { id: 'p-shanvi',   name: 'Shanvi Patel',         department: 'Marketing',  role: 'Marketing Trainee',                 seniority: 'Trainee',location: 'Mumbai',     email: 'shanvi@1702digital.com',               is_team_lead: false },
  { id: 'p-yassha',   name: 'Yassha Gada',          department: 'Marketing',  role: 'Marketing Trainee',                 seniority: 'Trainee',location: 'Mumbai',     email: 'yassha@1702digital.com',               is_team_lead: false },
];

const DEPT_ORDER = ['Leadership', 'Ops', 'Account', 'Creative', 'Video', 'SEO', 'Content', 'Sales', 'Marketing'];

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

const DEPARTMENTS = ['Creative', 'Video', 'Account', 'SEO', 'Content', 'Sales', 'Marketing', 'Ops', 'Leadership'];
const SENIORITIES = ['Exec', 'Lead', 'Senior', 'Mid', 'Junior', 'Trainee', 'Intern'];

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Person) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Creative');
  const [seniority, setSeniority] = useState('Mid');
  const [location, setLocation] = useState('Mumbai');
  const [isLead, setIsLead] = useState(false);
  const [error, setError] = useState('');

  function save() {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!role.trim()) { setError('Role is required.'); return; }
    onAdd({ id: `demo-${Date.now()}`, name: name.trim(), email: email.trim(), role: role.trim(), department, seniority, location: location.trim() || 'Mumbai', is_team_lead: isLead });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '540px', background: 'var(--cream)', border: '1.5px solid var(--ink)', borderRadius: '18px', boxShadow: '10px 10px 0 var(--ink)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>Team</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '32px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Add Person</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: 'var(--gray)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Vineet Shelar" style={inputStyle} /></div>
            <div><label style={labelStyle}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="vineet@1702digital.com" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>Role / Title</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="Video Editor" style={inputStyle} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Department</label><select value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div>
            <div><label style={labelStyle}>Seniority</label><select value={seniority} onChange={e => setSeniority(e.target.value)} style={inputStyle}>{SENIORITIES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label style={labelStyle}>Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Mumbai" style={inputStyle} /></div>
          <div onClick={() => setIsLead(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isLead ? 'var(--yellow)' : 'var(--paper)', border: `1px solid ${isLead ? 'var(--ink)' : 'var(--line)'}`, borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>Team Lead</p>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '3px' }}>Can use Allocator, see all tasks, approve work</p>
            </div>
            <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1.5px solid var(--ink)', background: isLead ? 'var(--ink)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isLead && <span style={{ color: 'var(--cream)', fontSize: '12px', lineHeight: 1 }}>✓</span>}
            </div>
          </div>
          {error && <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--red)' }}>{error}</p>}
        </div>

        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--line)', display: 'flex', gap: '10px' }}>
          <button onClick={save} style={{ flex: 1, background: 'var(--ink)', color: 'var(--cream)', padding: '12px 16px', borderRadius: '999px', border: '1px solid var(--ink)', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>+ Add to team</button>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--ink)', color: 'var(--ink)', padding: '12px 16px', borderRadius: '999px', fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function DemoTeamPage() {
  const [people, setPeople] = useState<Person[]>(MOCK_TEAM);
  const [showAdd, setShowAdd] = useState(false);

  const grouped = DEPT_ORDER.reduce<Record<string, Person[]>>((acc, dept) => {
    const members = people.filter(p => p.department === dept);
    if (members.length) acc[dept] = members;
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-10">
        <div className="flex items-end justify-between">
          <div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '8px' }}>{people.length} people</p>
            <h1 className="font-display text-5xl uppercase tracking-tight">Team</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--ink)', color: 'var(--cream)', border: '1px solid var(--ink)', borderRadius: '999px', padding: '10px 20px', cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)' }}
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
                <div key={person.id} className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{person.name}</p>
                      {person.is_team_lead && (
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--ink)', borderRadius: '999px', padding: '1px 7px', color: 'var(--ink)' }}>Lead</span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '3px' }}>{person.role}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase' }}>{person.seniority}</p>
                    <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)' }}>{person.location}</p>
                    <a href={`mailto:${person.email}`} style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--cobalt)', textDecoration: 'none' }}>{person.email}</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdd={p => setPeople(prev => [...prev, p])}
        />
      )}
    </>
  );
}
