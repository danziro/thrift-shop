export default function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-200/60" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-3" />
        <div className="h-3 bg-gray-200 rounded w-full mt-3" />
        <div className="h-3 bg-gray-200 rounded w-5/6 mt-2" />
        <div className="mt-4 flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-8 bg-gray-200 rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}


