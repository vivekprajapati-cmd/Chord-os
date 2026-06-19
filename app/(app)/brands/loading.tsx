export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-3 w-24 bg-[var(--line)] rounded animate-pulse" />
      <div className="h-12 w-64 bg-[var(--line)] rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-28 bg-[var(--line)] rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
