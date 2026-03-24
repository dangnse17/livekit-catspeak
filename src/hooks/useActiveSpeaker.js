import { useCallback, useEffect, useRef, useState } from "react";
import { RoomEvent } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";
import {
  ACTIVE_SPEAKER_DEBOUNCE_MS,
  ACTIVE_SPEAKER_THRESHOLD,
} from "../constants/livekit";

/**
 * Hook that detects the currently active speakers in a LiveKit room.
 *
 * @returns {{
 *   activeSpeakers: import("livekit-client").Participant[],
 *   dominantSpeaker: import("livekit-client").Participant | null,
 *   isSpeaking: (participantSid: string) => boolean,
 * }}
 */
export function useActiveSpeaker() {
  const room = useRoomContext();
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!room) return;

    const handleSpeakersChanged = (speakers) => {
      // Filter out low-level noise
      const filtered = speakers.filter(
        (s) => (s.audioLevel ?? 0) > ACTIVE_SPEAKER_THRESHOLD,
      );

      // Debounce to avoid rapid flickering
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setActiveSpeakers(filtered);
      }, ACTIVE_SPEAKER_DEBOUNCE_MS);
    };

    room.on(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged);

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [room]);

  // The first speaker in the array is typically the dominant one
  const dominantSpeaker = activeSpeakers.length > 0 ? activeSpeakers[0] : null;

  const isSpeaking = useCallback(
    (participantSid) => activeSpeakers.some((s) => s.sid === participantSid),
    [activeSpeakers],
  );

  return { activeSpeakers, dominantSpeaker, isSpeaking };
}
