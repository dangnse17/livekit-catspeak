import { useEffect, useRef } from "react";
import { RoomEvent } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";
import { playJoinSound, playLeaveSound } from "../utils/notificationSounds";

/**
 * useParticipantNotify — plays a chime when remote participants join or leave.
 * Skips the initial participant list (only reacts to changes after mount).
 */
export function useParticipantNotify() {
  const room = useRoomContext();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!room) return;

    // Skip sounds for the first second after connecting (initial participant list)
    const timer = setTimeout(() => {
      mountedRef.current = true;
    }, 500);

    const onJoin = () => {
      if (mountedRef.current) playJoinSound();
    };

    const onLeave = () => {
      if (mountedRef.current) playLeaveSound();
    };

    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room]);
}
