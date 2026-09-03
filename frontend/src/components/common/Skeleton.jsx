/**
 * Skeleton placeholders for list-heavy pages, shown while data loads
 * instead of a generic spinner - gives a sense of the page's shape
 * immediately rather than a blank wait.
 */

export function SkeletonListItem() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-mist-200 bg-white p-4 shadow-sm">
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-2/5 rounded" />
        <div className="skeleton h-3 w-3/5 rounded" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-mist-200 bg-white shadow-sm">
      <div className="skeleton h-28 w-full" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, columns = 'grid-cols-2 sm:grid-cols-3' }) {
  return (
    <div className={`grid gap-3 ${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-7 w-56 rounded" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-mist-200 bg-white p-4">
            <div className="skeleton mx-auto h-7 w-10 rounded" />
            <div className="skeleton mx-auto mt-2 h-3 w-16 rounded" />
          </div>
        ))}
      </div>
      <SkeletonList count={3} />
    </div>
  );
}
