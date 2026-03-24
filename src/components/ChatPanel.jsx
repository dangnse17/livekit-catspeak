import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveKitChat } from "../hooks/useLiveKitChat";
import { DATA_MESSAGE_TYPES, REACTIONS } from "../constants/livekit";

/**
 * ChatPanel — collapsible real-time chat sidebar using LiveKit data channels.
 */
export function ChatPanel() {
  const { messages, sendMessage, sendReaction, unreadCount, markAllRead } =
    useLiveKitChat();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  // Mark all as read when panel opens
  useEffect(() => {
    if (isOpen) markAllRead();
  }, [isOpen, markAllRead]);

  const handleSend = useCallback(() => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }, [draft, sendMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const togglePanel = useCallback(() => {
    setIsOpen((v) => !v);
  }, []);

  return (
    <>
      {/* Toggle button */}
      <button
        className="chat-toggle-btn"
        onClick={togglePanel}
        title={isOpen ? "Close chat" : "Open chat"}
      >
        💬
        {!isOpen && unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="chat-panel glass">
          <div className="chat-panel-header">
            <span className="chat-panel-title">Chat</span>
            <button className="chat-close-btn" onClick={togglePanel}>
              ✕
            </button>
          </div>

          {/* Message list */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                No messages yet. Say hello! 👋
              </div>
            )}
            {messages.map((msg) => {
              if (msg.type === DATA_MESSAGE_TYPES.REACTION) {
                return (
                  <div key={msg.id} className="chat-reaction-bubble">
                    <span className="chat-reaction-emoji">{msg.content}</span>
                    <span className="chat-reaction-sender">
                      {msg.isLocal ? "You" : msg.sender?.name}
                    </span>
                  </div>
                );
              }
              if (msg.type === DATA_MESSAGE_TYPES.SYSTEM_NOTIFICATION) {
                return (
                  <div key={msg.id} className="chat-system">
                    {msg.content}
                  </div>
                );
              }
              // CHAT_MESSAGE
              return (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.isLocal ? "local" : "remote"}`}
                >
                  <div className="chat-message-header">
                    <span className="chat-sender">
                      {msg.isLocal ? "You" : msg.sender?.name}
                    </span>
                    <span className="chat-timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="chat-message-body">{msg.content}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reaction bar */}
          <div className="chat-reactions-bar">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                className="chat-reaction-btn"
                onClick={() => sendReaction(emoji)}
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <input
              className="chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              autoComplete="off"
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!draft.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
