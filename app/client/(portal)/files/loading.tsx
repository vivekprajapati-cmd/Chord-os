export default function FilesLoading() {
  return (
    <div>
      <div style={{ height: '44px', width: '120px', borderRadius: '8px', background: 'var(--line)', marginBottom: '8px' }} className="skeleton" />
      <div style={{ height: '14px', width: '320px', borderRadius: '6px', background: 'var(--line)', marginBottom: '32px' }} className="skeleton" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--line)', flexShrink: 0 }} className="skeleton" />
              <div>
                <div style={{ height: '14px', width: `${120 + (i % 3) * 40}px`, borderRadius: '6px', background: 'var(--line)', marginBottom: '6px' }} className="skeleton" />
                <div style={{ height: '10px', width: '80px', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
              </div>
            </div>
            <div style={{ height: '12px', width: '72px', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
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
