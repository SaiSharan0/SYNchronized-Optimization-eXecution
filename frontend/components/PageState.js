import CandleLoader from "./CandleLoader";

export function LoadingState({ label = "Loading...", className = "" }) {
  return (
    <div className={`state-card ${className}`}>
      <CandleLoader label={label} />
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this section.",
  retryLabel = "Retry",
  onRetry,
  className = "",
}) {
  return (
    <div className={`state-card ${className}`}>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {onRetry ? (
        <button type="button" className="btn-primary" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title = "No data yet",
  message = "Create your first item to get started.",
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div className={`state-card ${className}`}>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn-success" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
