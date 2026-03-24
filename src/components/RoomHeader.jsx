import { ConnectionTimer } from "./ConnectionTimer";

/**
 * RoomHeader — top bar with room name, participant count/limit, timer, and leave button.
 */
export function RoomHeader({
  roomName,
  currentCount,
  maxCount,
  isNearCapacity,
  connectTime,
  onLeave,
}) {
  return (
    <div className="room-header">
      <div className="room-header-left">
        <span className="room-name-tag">🏠 {roomName || "Room"}</span>
        <span
          className={`participant-badge ${isNearCapacity ? "capacity-warning" : ""}`}
        >
          👥 {currentCount} / {maxCount}
        </span>
        {connectTime && <ConnectionTimer startTime={connectTime} />}
      </div>
      <button className="btn-danger btn-sm" onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}
