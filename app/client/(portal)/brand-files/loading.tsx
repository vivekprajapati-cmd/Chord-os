export default function BrandFilesLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ height: '44px', width: '260px', background: 'var(--line)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: '12px', width: '80px', background: 'var(--line)', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: '34px', width: '100px', background: 'var(--line)', borderRadius: '999px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: '68px', background: 'var(--line)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    </div>
  );
}
