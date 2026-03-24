import { useCallback, useEffect, useRef, useState } from "react";
import { DataPacket_Kind, RoomEvent } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";
import { DATA_MESSAGE_TYPES } from "../constants/livekit";

/**
 * Generate a simple unique ID (avoids external uuid dependency).
 */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Decode a Uint8Array data packet into a parsed message object.
 * Returns null if the data is not a valid chat-protocol message.
 */
function decodePacket(payload) {
  try {
    const text = new TextDecoder().decode(payload);
    const parsed = JSON.parse(text);
    if (parsed && parsed.type && parsed.payload) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Encode a message object into a Uint8Array for publishData().
 */
function encodePacket(type, payload) {
  return new TextEncoder().encode(JSON.stringify({ type, payload }));
}

/**
 * Custom hook for real-time chat over LiveKit data channels.
 *
 * @returns {{
 *   messages: Array<{id: string, type: string, sender: {identity: string, name: string}, content: string, timestamp: number, isLocal: boolean}>,
 *   sendMessage: (text: string) => void,
 *   sendReaction: (emoji: string) => void,
 *   unreadCount: number,
 *   markAllRead: () => void,
 * }}
 */
export function useLiveKitChat() {
  const room = useRoomContext();
  const [messages, setMessages] = useState([]);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(Date.now());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // ─── Incoming messages ───
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload, participant) => {
      const packet = decodePacket(payload);
      if (!packet) return;

      const { type, payload: data } = packet;
      const validTypes = Object.values(DATA_MESSAGE_TYPES);
      if (!validTypes.includes(type)) return;

      // Avoid duplicates by id
      if (messagesRef.current.some((m) => m.id === data.id)) return;

      setMessages((prev) => [
        ...prev,
        {
          ...data,
          type,
          isLocal: false,
          sender: data.sender || {
            identity: participant?.identity ?? "unknown",
            name: participant?.name ?? participant?.identity ?? "Unknown",
          },
        },
      ]);
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // ─── Send a chat message ───
  const sendMessage = useCallback(
    (text) => {
      if (!room?.localParticipant || !text.trim()) return;

      const msg = {
        id: uid(),
        sender: {
          identity: room.localParticipant.identity,
          name: room.localParticipant.name || room.localParticipant.identity,
        },
        content: text.trim(),
        timestamp: Date.now(),
      };

      const encoded = encodePacket(DATA_MESSAGE_TYPES.CHAT_MESSAGE, msg);
      room.localParticipant.publishData(encoded, {
        kind: DataPacket_Kind.RELIABLE,
      });

      // Add to local state immediately
      setMessages((prev) => [
        ...prev,
        { ...msg, type: DATA_MESSAGE_TYPES.CHAT_MESSAGE, isLocal: true },
      ]);
    },
    [room],
  );

  // ─── Send a reaction ───
  const sendReaction = useCallback(
    (emoji) => {
      if (!room?.localParticipant) return;

      const msg = {
        id: uid(),
        sender: {
          identity: room.localParticipant.identity,
          name: room.localParticipant.name || room.localParticipant.identity,
        },
        content: emoji,
        timestamp: Date.now(),
      };

      const encoded = encodePacket(DATA_MESSAGE_TYPES.REACTION, msg);
      room.localParticipant.publishData(encoded, {
        kind: DataPacket_Kind.LOSSY,
      });

      setMessages((prev) => [
        ...prev,
        { ...msg, type: DATA_MESSAGE_TYPES.REACTION, isLocal: true },
      ]);
    },
    [room],
  );

  // ─── Unread count ───
  const unreadCount = messages.filter(
    (m) =>
      !m.isLocal &&
      m.timestamp > lastReadTimestamp &&
      m.type === DATA_MESSAGE_TYPES.CHAT_MESSAGE,
  ).length;

  const markAllRead = useCallback(() => {
    setLastReadTimestamp(Date.now());
  }, []);

  return { messages, sendMessage, sendReaction, unreadCount, markAllRead };
}
