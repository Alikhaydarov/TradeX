export default function Loading() {
  return (
    <div
      className="dashboard-loading"
      role="status"
      aria-label="Loading your dashboard"
      aria-busy="true"
    >
      <div className="dashboard-loading-title" />
      <div className="dashboard-loading-metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} />
        ))}
      </div>
      <div className="dashboard-loading-chart" />
    </div>
  );
}
