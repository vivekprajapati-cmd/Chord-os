export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-3 w-24 bg-[var(--line)] rounded animate-pulse" />
      <div className="h-10 w-48 bg-[var(--line)] rounded animate-pulse" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-[var(--line)] rounded-full animate-pulse" />
        ))}
      </div>
      <div className="h-[500px] bg-[var(--line)] rounded-2xl animate-pulse" />
    </div>
  );
}
