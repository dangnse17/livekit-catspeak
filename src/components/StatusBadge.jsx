/**
 * StatusBadge — connection status indicator with dot, label, server URL, and error.
 */
export function StatusBadge({ status, error, serverUrl }) {
  const dotClass =
    status === "Connected"
      ? "connected"
      : status === "Requesting token..." || status === "Logging in..."
        ? "connecting"
        : error
          ? "error"
          : "idle";

  return (
    <div className="status-card">
      <div className="status-row">
        <span className={`status-dot ${dotClass}`} />
        <span className="status-label">{status}</span>
      </div>
      {serverUrl && <div className="status-detail">🖥️ {serverUrl}</div>}
      {error && <div className="error-text">⚠ {error}</div>}
    </div>
  );
}
