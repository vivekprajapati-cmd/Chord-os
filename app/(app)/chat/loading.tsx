export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-3 w-24 bg-[var(--line)] rounded animate-pulse" />
      <div className="h-[600px] bg-[var(--line)] rounded-2xl animate-pulse" />
    </div>
  );
}
