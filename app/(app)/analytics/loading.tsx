export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-32 bg-[var(--line)] rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--line)] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-[var(--line)] rounded-2xl animate-pulse" />
    </div>
  );
}