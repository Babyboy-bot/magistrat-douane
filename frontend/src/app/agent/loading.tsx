export default function AgentLoading() {
  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-navy-100" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-navy-50" />
    </div>
  );
}
