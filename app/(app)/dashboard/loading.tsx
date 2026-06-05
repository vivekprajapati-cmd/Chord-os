export default function Loading() {
  return (
    <div className="space-y-12">
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
        <div className="h-3 w-32 bg-[var(--line)] rounded animate-pulse mb-3" />
        <div className="h-16 w-72 bg-[var(--line)] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--line)] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--line)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}