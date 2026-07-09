export default function OverviewLoading() {
  return (
    <div>
      {/* Title */}
      <div style={{ height: '44px', width: '220px', borderRadius: '8px', background: 'var(--line)', marginBottom: '8px' }} className="skeleton" />
      <div style={{ height: '14px', width: '280px', borderRadius: '6px', background: 'var(--line)', marginBottom: '32px' }} className="skeleton" />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ height: '10px', width: '80px', borderRadius: '4px', background: 'var(--line)', marginBottom: '12px' }} className="skeleton" />
            <div style={{ height: '36px', width: '48px', borderRadius: '6px', background: 'var(--line)' }} className="skeleton" />
          </div>
        ))}
      </div>

      {/* Deliverable rows */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < 4 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ height: '22px', width: '72px', borderRadius: '999px', background: 'var(--line)' }} className="skeleton" />
              <div style={{ height: '14px', width: '160px', borderRadius: '6px', background: 'var(--line)' }} className="skeleton" />
            </div>
            <div style={{ height: '12px', width: '80px', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
          </div>
        ))}
      </div>

      <style>{`
        .skeleton { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
