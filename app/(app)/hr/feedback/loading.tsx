export default function HRFeedbackLoading() {
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
            <div style={{ ...pulse, width: 80, height: 10, marginBottom: '12px' }} />
            <div style={{ ...pulse, width: 48, height: 28, marginBottom: '8px' }} />
            <div style={{ ...pulse, width: 100, height: 10 }} />
          </div>
        ))}
      </div>

      {/* Two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        <div style={{ border: '1.5px solid var(--line)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ ...pulse, width: 120, height: 12 }} />
            <div style={{ ...pulse, width: 160, height: 28, borderRadius: '6px' }} />
          </div>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ ...pulse, width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ ...pulse, width: 100, height: 12 }} />
              </div>
              {[60, 60, 48, 80].map((w, j) => <div key={j} style={{ ...pulse, width: w, height: 12 }} />)}
            </div>
          ))}
        </div>
        <div style={{ border: '1.5px solid var(--line)', borderRadius: '14px', padding: '16px 18px' }}>
          {[120, 180, 100, 100, 180, 180, 180].map((w, i) => (
            <div key={i} style={{ ...pulse, width: w, height: i === 6 ? 80 : 12, marginBottom: 16, borderRadius: i === 6 ? '8px' : '6px' }} />
          ))}
          <div style={{ ...pulse, width: '100%', height: 38, borderRadius: '999px', marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}
