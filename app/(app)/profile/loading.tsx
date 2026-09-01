export default function ProfileLoading() {
  return (
    <div style={{ width: '100%', padding: '0 0 60px' }}>
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

      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="sk" style={{ width: 60, height: 10, marginBottom: 8 }} />
          <div className="sk" style={{ width: 160, height: 28 }} />
          <div className="sk" style={{ width: 280, height: 10, marginTop: 8 }} />
        </div>
        <div className="sk" style={{ width: 80, height: 80, borderRadius: '50%' }} />
      </div>

      {/* Profile card */}
      <div style={{ border: '1.5px solid var(--line)', borderRadius: 14, background: 'var(--cream)', overflow: 'hidden', marginBottom: 14 }}>
        {/* Avatar + name row */}
        <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className="sk" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <div className="sk" style={{ width: 160, height: 18 }} />
              <div className="sk" style={{ width: 60, height: 18, borderRadius: 999 }} />
            </div>
            <div className="sk" style={{ width: 100, height: 12, marginBottom: 8 }} />
            <div className="sk" style={{ width: 80, height: 10 }} />
          </div>
        </div>

        {/* Fields section */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="sk" style={{ width: 110, height: 10 }} />
            <div className="sk" style={{ width: 48, height: 24, borderRadius: 999 }} />
          </div>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 20px', marginBottom: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i}>
                <div className="sk" style={{ width: '50%', height: 8, marginBottom: 6 }} />
                <div className="sk" style={{ width: '80%', height: 14 }} />
              </div>
            ))}
          </div>
          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 20px' }}>
            {[1,2].map(i => (
              <div key={i}>
                <div className="sk" style={{ width: '50%', height: 8, marginBottom: 6 }} />
                <div className="sk" style={{ width: '70%', height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1.5px solid var(--line)', paddingBottom: 8, marginBottom: 16 }}>
        <div className="sk" style={{ width: 80, height: 24, borderRadius: 4 }} />
        <div className="sk" style={{ width: 96, height: 24, borderRadius: 4 }} />
      </div>

      {/* Leave balance card */}
      <div style={{ border: '1.5px solid var(--line)', borderRadius: 14, background: 'var(--cream)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="sk" style={{ width: 120, height: 12 }} />
          <div className="sk" style={{ width: 100, height: 10 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px' }}>
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, borderRight: '1px solid var(--line)' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ borderRadius: 10, padding: '12px 14px', background: 'var(--paper)' }}>
                <div className="sk" style={{ width: '60%', height: 10, marginBottom: 10 }} />
                <div className="sk" style={{ width: '40%', height: 24, marginBottom: 10 }} />
                <div className="sk" style={{ width: '100%', height: 4, borderRadius: 4 }} />
              </div>
            ))}
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div className="sk" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div className="sk" style={{ width: '80%', height: 14 }} />
            <div className="sk" style={{ width: '90%', height: 10 }} />
            <div className="sk" style={{ width: '100%', height: 34, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Leave history card */}
      <div style={{ border: '1.5px solid var(--line)', borderRadius: 14, background: 'var(--cream)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div className="sk" style={{ width: 100, height: 12 }} />
        </div>
        <div style={{ padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
          <div className="sk" style={{ width: 240, height: 12 }} />
        </div>
      </div>
    </div>
  );
}
