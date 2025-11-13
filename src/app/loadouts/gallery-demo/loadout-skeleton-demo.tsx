export function LoadoutSkeleton() {
  return (
    <div className="bg-[#141B2E] border border-[#3B82F6]/20 rounded-lg p-4 animate-pulse">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="h-6 w-32 bg-[#0A0E1A] rounded" />
          <div className="h-6 w-16 bg-[#0A0E1A] rounded" />
        </div>
        <div className="h-4 w-24 bg-[#0A0E1A] rounded" />
      </div>

      {/* Preview Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-video bg-[#0A0E1A] rounded border border-[#3B82F6]/10" />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 bg-[#0A0E1A] rounded" />
          <div className="h-4 w-12 bg-[#0A0E1A] rounded" />
        </div>
        <div className="h-4 w-20 bg-[#0A0E1A] rounded" />
      </div>

      {/* Button */}
      <div className="h-10 w-full bg-[#0A0E1A] rounded" />
    </div>
  )
}
