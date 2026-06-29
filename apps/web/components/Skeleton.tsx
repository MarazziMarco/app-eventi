/** Skeleton di caricamento (no spinner): hero + alcune card. */
export function FeedSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-5" aria-hidden>
      <div className="aspect-[16/10] w-full rounded-3xl bg-surface sm:aspect-[16/8]" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl bg-surface p-3">
            <div className="h-28 w-28 shrink-0 rounded-xl bg-surface-2 sm:h-32 sm:w-32" />
            <div className="flex-1 space-y-2 py-2">
              <div className="h-4 w-3/4 rounded bg-surface-2" />
              <div className="h-3 w-1/2 rounded bg-surface-2" />
              <div className="h-3 w-1/3 rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
