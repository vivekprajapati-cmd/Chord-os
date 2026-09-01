export default function HarmonyCoreLoading() {
  return (
    <div style={{ width: '100%' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .sk {
          border-radius: 6px;
          background: linear-gradient(90deg, var(--line) 25%, var(--paper) 50%, var(--line) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>

      {/* Top bar: title + month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sk" style={{ width: 160, height: 22 }} />
          <div className="sk" style={{ width: 100, height: 30, borderRadius: 999 }} />
        </div>
        <div className="sk" style={{ width: 200, height: 34, borderRadius: 8 }} />
      </div>

      {/* Person tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[100, 90, 110, 95, 105, 88].map((w, i) => (
          <div key={i} className="sk" style={{ width: w, height: 34, borderRadius: 999 }} />
        ))}
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="sk" style={{ width: 180, height: 14 }} />
          <div className="sk" style={{ width: 90, height: 14 }} />
        </div>
      </div>

      {/* Table card */}
      <div style={{ border: '1.5px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--cream)' }}>
        {/* Table header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(5, 1fr)', gap: 0, background: 'var(--paper)', padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
          {[120, 80, 80, 80, 80, 80].map((w, i) => (
            <div key={i} className="sk" style={{ width: w, height: 9 }} />
          ))}
        </div>

        {/* Table rows */}
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(5, 1fr)', gap: 0, padding: '14px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <div className="sk" style={{ width: 110, height: 13 }} />
            {[60, 70, 60, 60, 48].map((w, j) => (
              <div key={j} className="sk" style={{ width: w, height: 13 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
