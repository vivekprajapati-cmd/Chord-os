export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="h-12 w-28 bg-[var(--line)] rounded animate-pulse" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-[var(--line)] rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--line)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}