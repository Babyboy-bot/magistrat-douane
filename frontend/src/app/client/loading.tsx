export default function ClientLoading() {
  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  );
}
