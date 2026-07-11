/**
 * Per-panel error with an inline Retry. Distinct from the app-level
 * connection banner: this is "this panel's fetch failed", not "the server
 * is gone".
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="error-state">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
