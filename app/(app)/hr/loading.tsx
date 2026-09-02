function Bone({ w, h, r = 6 }: { w: string; h: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'var(--line)', animation: 'pulse 1.4s ease-in-out infinite' }} />
  );
}

export default function HRLoading() {
  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ paddingTop: '8px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Bone w="80px" h={10} />
            <Bone w="100px" h={80} r={4} />
            <Bone w="140px" h={12} />
            <Bone w="300px" h={14} />
            <Bone w="240px" h={14} />
          </div>
          <Bone w="220px" h={160} r={8} />
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: 'white', border: '1px solid var(--line)', borderLeft: '3px solid var(--line)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Bone w="28px" h={12} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--line)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                <Bone w="100px" h={18} />
              </div>
              <Bone w="100%" h={13} />
              <Bone w="80%" h={13} />
              <Bone w="50px" h={10} />
            </div>
          ))}
        </div>

        {/* Activity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Bone w="160px" h={10} />
            <Bone w="120px" h={10} />
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--line)', flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite' }} />
                <Bone w="120px" h={12} />
                <Bone w="90px" h={12} />
                <Bone w="100px" h={20} r={999} />
                <Bone w="120px" h={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
