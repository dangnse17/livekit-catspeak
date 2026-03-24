/**
 * LiveKit constants for CatSpeak MVP
 */

/** Maximum participants allowed per room */
export const MAX_PARTICIPANTS = 5;

/** Percentage threshold to show "near capacity" warning */
export const CAPACITY_WARNING_THRESHOLD = 0.8;

/** Audio level threshold for active speaker detection */
export const ACTIVE_SPEAKER_THRESHOLD = 0.1;

/** Debounce interval (ms) for active speaker changes */
export const ACTIVE_SPEAKER_DEBOUNCE_MS = 300;

/**
 * Data channel message types sent via LocalParticipant.publishData()
 */
export const DATA_MESSAGE_TYPES = Object.freeze({
  CHAT_MESSAGE: "CHAT_MESSAGE",
  REACTION: "REACTION",
  SYSTEM_NOTIFICATION: "SYSTEM_NOTIFICATION",
});

/**
 * Available reaction emojis
 */
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥"];
