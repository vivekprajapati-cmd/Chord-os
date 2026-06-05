export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-32 bg-[var(--line)] rounded animate-pulse" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 bg-[var(--line)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}