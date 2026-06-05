export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-32 bg-[var(--line)] rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-[var(--line)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}