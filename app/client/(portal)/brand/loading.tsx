export default function BrandLoading() {
  return (
    <div>
      <div style={{ height: '44px', width: '180px', borderRadius: '8px', background: 'var(--line)', marginBottom: '8px' }} className="skeleton" />
      <div style={{ height: '14px', width: '200px', borderRadius: '6px', background: 'var(--line)', marginBottom: '32px' }} className="skeleton" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Colors card */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ height: '10px', width: '100px', borderRadius: '4px', background: 'var(--line)', marginBottom: '16px' }} className="skeleton" />
          <div style={{ display: 'flex', gap: '16px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--line)' }} className="skeleton" />
                <div>
                  <div style={{ height: '12px', width: '52px', borderRadius: '4px', background: 'var(--line)', marginBottom: '4px' }} className="skeleton" />
                  <div style={{ height: '10px', width: '40px', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography card */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ height: '10px', width: '100px', borderRadius: '4px', background: 'var(--line)', marginBottom: '16px' }} className="skeleton" />
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ height: '10px', width: '80px', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
              <div style={{ height: '15px', width: '120px', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
            </div>
          ))}
        </div>

        {/* Voice card */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ height: '10px', width: '100px', borderRadius: '4px', background: 'var(--line)', marginBottom: '16px' }} className="skeleton" />
          <div style={{ height: '14px', width: '100%', borderRadius: '4px', background: 'var(--line)', marginBottom: '8px' }} className="skeleton" />
          <div style={{ height: '14px', width: '85%', borderRadius: '4px', background: 'var(--line)', marginBottom: '8px' }} className="skeleton" />
          <div style={{ height: '14px', width: '70%', borderRadius: '4px', background: 'var(--line)' }} className="skeleton" />
        </div>
      </div>

      <style>{`
        .skeleton { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
