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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', borderRadius: '12px', border: '0.5px solid var(--border)', padding: '1.5rem', width: '420px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)' }}>{LABELS[type]}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isWeekly ? 'Mark weeks updated' : 'Mark days updated'} — {rate}% completion
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}>×</button>
        </div>

        {isWeekly ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weeks.map((week, i) => {
              const key = weekKeys[i];
              const isChecked = checked.has(key);
              const label = `Week ${i + 1} (${week[0].slice(5)} – ${week[week.length - 1].slice(5)})`;
              return (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: 'var(--radius)', background: isChecked ? 'var(--bg-success)' : 'var(--surface-1)', border: '0.5px solid var(--border)' }}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(key)} style={{ accentColor: 'var(--fill-success)' }} />
                  <span style={{ fontSize: '13px', color: isChecked ? 'var(--text-success)' : 'var(--text-secondary)' }}>{label}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {Array.from({ length: days }, (_, i) => {
              const d = new Date(month + 'T00:00:00');
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              const isChecked = checked.has(key);
              return (
                <button key={key} onClick={() => toggle(key)}
                  style={{ padding: '6px 4px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)', background: isChecked ? 'var(--bg-success)' : 'var(--surface-1)', color: isChecked ? 'var(--text-success)' : 'var(--text-secondary)', fontWeight: isChecked ? 500 : 400 }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--ink, #0D0D0B)', color: '#F0EDE5', fontSize: '13px', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
