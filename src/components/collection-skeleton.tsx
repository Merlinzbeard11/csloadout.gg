export function CollectionSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-12 bg-cs2-dark rounded"></div>
        <div className="h-4 w-4 bg-cs2-dark rounded"></div>
        <div className="h-4 w-24 bg-cs2-dark rounded"></div>
        <div className="h-4 w-4 bg-cs2-dark rounded"></div>
        <div className="h-4 w-32 bg-cs2-dark rounded"></div>
      </div>

      {/* Header skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-8 w-64 bg-cs2-dark rounded"></div>
        <div className="h-4 w-96 bg-cs2-dark rounded"></div>
        <div className="h-4 w-32 bg-cs2-dark rounded"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-4">
            <div className="aspect-square bg-cs2-darker rounded-md mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-cs2-darker rounded w-full"></div>
              <div className="h-3 bg-cs2-darker rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
