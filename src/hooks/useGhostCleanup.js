import { useEffect, useRef } from "react";
import { RoomEvent } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

/**
 * Hook that prevents "ghost participants" by handling:
 * - RoomEvent.Disconnected — cleanup on unexpected disconnection
 * - browser `beforeunload` — graceful disconnect on tab close
 * - document `visibilitychange` — detect tab going to background
 *
 * @param {() => void} onCleanup — callback to reset application state on disconnect
 */
export function useGhostCleanup(onCleanup) {
  const room = useRoomContext();
  const onCleanupRef = useRef(onCleanup);
  onCleanupRef.current = onCleanup;

  useEffect(() => {
    if (!room) return;

    // ─── LiveKit disconnect event ───
    const handleDisconnected = () => {
      onCleanupRef.current?.();
    };

    // ─── Browser tab close / navigation ───
    const handleBeforeUnload = () => {
      try {
        room.disconnect();
      } catch {
        // swallow — tab is closing
      }
    };

    // ─── Tab visibility change (optional: disconnect on prolonged hiding) ───
    let hiddenTimer = null;
    const HIDDEN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Start a timer — if tab stays hidden too long, disconnect
        hiddenTimer = setTimeout(() => {
          try {
            room.disconnect();
          } catch {
            // swallow
          }
          onCleanupRef.current?.();
        }, HIDDEN_TIMEOUT_MS);
      } else {
        // Tab became visible again, cancel disconnect timer
        if (hiddenTimer) {
          clearTimeout(hiddenTimer);
          hiddenTimer = null;
        }
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (hiddenTimer) clearTimeout(hiddenTimer);
    };
  }, [room]);
}
