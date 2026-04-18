export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center bg-surface"
      role="status"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}
