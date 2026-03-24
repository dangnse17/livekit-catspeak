import { useEffect, useRef } from "react";
import {
  ControlBar,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import { useActiveSpeaker } from "../hooks/useActiveSpeaker";
import { useParticipantLimit } from "../hooks/useParticipantLimit";
import { useGhostCleanup } from "../hooks/useGhostCleanup";
import { RoomHeader } from "./RoomHeader";
import { VideoGrid } from "./VideoGrid";
import { ParticipantSidebar } from "./ParticipantSidebar";
import { ChatPanel } from "./ChatPanel";

/**
 * RoomInner — orchestrates the in-room layout.
 * All LiveKit hooks are used here (inside LiveKitRoom context).
 *
 * @param {object} props
 * @param {string} props.roomName
 * @param {number|null} props.connectTime
 * @param {(reason?: string) => void} props.onLeave — called with a reason on capacity rejection
 */
export function RoomInner({ roomName, connectTime, onLeave }) {
  const room = useRoomContext();
  const { isSpeaking } = useActiveSpeaker();
  const { currentCount, maxCount, isNearCapacity, isFull } =
    useParticipantLimit();

  // Ghost cleanup: call onLeave when disconnected unexpectedly
  useGhostCleanup(onLeave);

  // ── Capacity enforcement: only kick the LOCAL participant if THEY are the overflow ──
  const hasBeenKicked = useRef(false);

  useEffect(() => {
    if (currentCount <= maxCount || hasBeenKicked.current) return;
    if (!room?.localParticipant) return;

    // Get all remote participants + local, sort by joinedAt ascending
    const allParticipants = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    // Sort by joinedAt (earliest first). Participants without joinedAt go last.
    allParticipants.sort((a, b) => {
      const timeA = a.joinedAt?.getTime?.() ?? Infinity;
      const timeB = b.joinedAt?.getTime?.() ?? Infinity;
      return timeA - timeB;
    });

    // The overflow participants are those beyond the maxCount slot
    const overflowParticipants = allParticipants.slice(maxCount);
    const localIsOverflow = overflowParticipants.some(
      (p) => p.sid === room.localParticipant.sid,
    );

    if (localIsOverflow) {
      hasBeenKicked.current = true;
      try {
        room.disconnect();
      } catch {
        // swallow
      }
      onLeave?.(
        `Room is full (${maxCount} max). You were the last to join and were removed.`,
      );
    }
  }, [currentCount, maxCount, room, onLeave]);

  return (
    <>
      <RoomHeader
        roomName={roomName}
        currentCount={currentCount}
        maxCount={maxCount}
        isNearCapacity={isNearCapacity}
        connectTime={connectTime}
        onLeave={onLeave}
      />
      <div className="room-layout">
        <div className="video-area">
          <VideoGrid isSpeaking={isSpeaking} />
        </div>
        <ParticipantSidebar isSpeaking={isSpeaking} />
      </div>
      <RoomAudioRenderer />
      <div className="controls-area">
        <ControlBar />
      </div>
      <ChatPanel />
    </>
  );
}
