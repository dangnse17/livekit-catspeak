import { useMemo } from "react";
import { useParticipants } from "@livekit/components-react";
import {
  CAPACITY_WARNING_THRESHOLD,
  MAX_PARTICIPANTS,
} from "../constants/livekit";

/**
 * Hook that tracks participant count against the room capacity limit.
 *
 * @param {number} [maxParticipants=MAX_PARTICIPANTS] — override for per-room limits
 * @returns {{
 *   currentCount: number,
 *   maxCount: number,
 *   isFull: boolean,
 *   isNearCapacity: boolean,
 *   capacityPercent: number,
 * }}
 */
export function useParticipantLimit(maxParticipants = MAX_PARTICIPANTS) {
  const participants = useParticipants();
  const currentCount = participants.length;

  return useMemo(() => {
    const capacityPercent =
      maxParticipants > 0 ? currentCount / maxParticipants : 0;
    return {
      currentCount,
      maxCount: maxParticipants,
      isFull: currentCount >= maxParticipants,
      isNearCapacity: capacityPercent >= CAPACITY_WARNING_THRESHOLD,
      capacityPercent,
    };
  }, [currentCount, maxParticipants]);
}
