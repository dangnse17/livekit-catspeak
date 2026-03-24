import { useLocalParticipant, useParticipants } from "@livekit/components-react";

/**
 * ActiveSpeakerIndicator — CSS-animated ring around a speaking participant.
 */
export function ActiveSpeakerIndicator({ isActive, children }) {
  return (
    <div className={`active-speaker-wrapper ${isActive ? "speaking" : ""}`}>
      {children}
      {isActive && <div className="active-speaker-ring" />}
    </div>
  );
}

/**
 * ParticipantSidebar — list of participants with mic/camera/speaker status.
 */
export function ParticipantSidebar({ isSpeaking }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  return (
    <div className="participant-sidebar">
      <div className="sidebar-title">Participants ({participants.length})</div>
      {participants.map((p) => {
        const isLocal = p.sid === localParticipant.sid;
        const initials = (p.name || p.identity || "?")
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const camOn = p.isCameraEnabled;
        const micOn = p.isMicrophoneEnabled;
        const speaking = isSpeaking?.(p.sid) ?? false;

        return (
          <div
            className={`participant-item ${speaking ? "is-speaking" : ""}`}
            key={p.sid}
          >
            <div className={`participant-avatar ${speaking ? "glow" : ""}`}>
              {initials}
            </div>
            <div className="participant-info">
              <div className="participant-name">
                {p.name || p.identity || "Unknown"}
                {isLocal && <span className="you-tag">(you)</span>}
              </div>
              <div className="participant-indicators">
                <span className={`indicator ${micOn ? "active" : "muted"}`}>
                  {micOn ? "🎤" : "🔇"}
                </span>
                <span className={`indicator ${camOn ? "active" : "muted"}`}>
                  {camOn ? "📷" : "📷‍🚫"}
                </span>
                {speaking && (
                  <span className="indicator speaking-indicator">🔊</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
