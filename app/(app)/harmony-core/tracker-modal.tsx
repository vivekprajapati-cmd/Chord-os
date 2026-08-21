'use client';

import { useState } from 'react';

type Props = {
  brandId: string;
  type: 'orm' | 'ops' | 'social';
  month: string;
  personId: string;
  entry: any;
  onClose: () => void;
  onSaved: () => void;
};

function daysInMonth(month: string) {
  const d = new Date(month + 'T00:00:00');
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function getWeekDates(month: string): string[][] {
  const d = new Date(month + 'T00:00:00');
  const year = d.getFullYear();
  const mon = d.getMonth();
  const days = new Date(year, mon + 1, 0).getDate();
  const weeks: string[][] = [];
  let week: string[] = [];
  for (let i = 1; i <= days; i++) {
    const date = `${year}-${String(mon + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    week.push(date);
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || i === days) {
      weeks.push(week);
      week = [];
    }
  }
  return weeks;
}

const LABELS: Record<string, string> = {
  orm: 'ORM Tracker',
  ops: 'Ops Tracker',
  social: 'Social Tracker',
};

export default function TrackerModal({ brandId, type, month, personId, entry, onClose, onSaved }: Props) {
  const logs: string[] = entry?.tracker_logs?.[type] ?? [];
  const [checked, setChecked] = useState<Set<string>>(new Set(logs));
  const [saving, setSaving] = useState(false);

  const isWeekly = type === 'social';
  const days = daysInMonth(month);
  const weeks = getWeekDates(month);

  // For weekly, use the first day of each week as the key
  const weekKeys = weeks.map(w => w[0]);

  function toggle(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const updatedLogs = {
      ...(entry?.tracker_logs ?? { orm: [], ops: [], social: [] }),
      [type]: Array.from(checked),
    };
    await fetch('/api/harmony-core', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        person_id: personId,
        brand_id: brandId,
        month,
        role_type: 'social',
        metrics: entry?.metrics ?? {},
        tracker_logs: updatedLogs,
      }),
    });
    setSaving(false);
    onSaved();
  }

  const rate = isWeekly
    ? Math.round((checked.size / weeks.length) * 100)
    : Math.round((checked.size / days) * 100);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #c8c4bc', boxShadow: '6px 6px 0 #0D0D0B', padding: '1.5rem', width: '440px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#0D0D0B' }}>{LABELS[type]}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
              {isWeekly ? 'Mark weeks updated' : 'Mark days updated'} — {rate}% completion
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', lineHeight: 1 }}>×</button>
        </div>

        {isWeekly ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weeks.map((week, i) => {
              const key = weekKeys[i];
              const isChecked = checked.has(key);
              const label = `Week ${i + 1} (${week[0].slice(5)} – ${week[week.length - 1].slice(5)})`;
              return (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: '6px', background: isChecked ? '#dcfce7' : '#f9f8f5', border: `1px solid ${isChecked ? '#86efac' : '#c8c4bc'}` }}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(key)} style={{ accentColor: '#16a34a', width: '15px', height: '15px' }} />
                  <span style={{ fontSize: '13px', color: isChecked ? '#15803d' : '#555', fontWeight: isChecked ? 500 : 400 }}>{label}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
            {/* Day-of-week headers */}
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: '#888', fontWeight: 600, paddingBottom: '2px', textTransform: 'uppercase' }}>{d}</div>
            ))}
            {/* Empty cells for offset */}
            {Array.from({ length: new Date(month + 'T00:00:00').getDay() }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = new Date(month + 'T00:00:00');
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              const isChecked = checked.has(key);
              return (
                <button key={key} onClick={() => toggle(key)}
                  style={{ padding: '7px 4px', borderRadius: '5px', border: `1px solid ${isChecked ? '#86efac' : '#c8c4bc'}`, cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', background: isChecked ? '#dcfce7' : '#fff', color: isChecked ? '#15803d' : '#555', fontWeight: isChecked ? 600 : 400 }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#0D0D0B', color: '#F0EDE5', fontSize: '13px', fontWeight: 500, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #c8c4bc', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#555' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
