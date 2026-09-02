export default function HRLeavesLoading() {
  const pulse = { animation: 'pulse 1.5s ease-in-out infinite', background: 'var(--line)', borderRadius: '6px' } as const;

  return (
    <div style={{ paddingTop: '8px', paddingBottom: '60px' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Tab bar skeleton */}
      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--line)', marginBottom: '24px', gap: '4px' }}>
        {[80, 64].map((w, i) => <div key={i} style={{ ...pulse, width: w, height: 14, margin: '10px 18px' }} />)}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ border: '1.5px solid var(--line)', borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ ...pulse, width: 120, height: 10, marginBottom: '12px' }} />
            <div style={{ ...pulse, width: 48, height: 28, marginBottom: '8px' }} />
            <div style={{ ...pulse, width: 100, height: 10 }} />
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {[180, 160, 140].map((w, i) => <div key={i} style={{ ...pulse, width: w, height: 34, borderRadius: '8px' }} />)}
      </div>

      {/* Table */}
      <div style={{ border: '1.5px solid var(--line)', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ ...pulse, width: 140, height: 12 }} />
        </div>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr 2fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ ...pulse, width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ ...pulse, width: 90, height: 12 }} />
            </div>
            {[48, 72, 72, 24, 90, 56, 64].map((w, j) => <div key={j} style={{ ...pulse, width: w, height: j === 5 ? 20 : 12, borderRadius: j === 5 ? '999px' : '6px' }} />)}
          </div>
        ))}
      </div>

      {/* Balance table */}
      <div style={{ border: '1.5px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ ...pulse, width: 220, height: 12 }} />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ ...pulse, width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ ...pulse, width: 90, height: 12 }} />
            </div>
            {[40, 40, 40, 40].map((w, j) => <div key={j} style={{ ...pulse, width: w, height: 12 }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
