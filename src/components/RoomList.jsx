import { useState, useEffect, useCallback } from "react";
import { fetchRooms } from "../services/tokenService";

/**
 * RoomList — Browse available rooms and click to join.
 *
 * @param {{
 *   apiBaseUrl: string,
 *   jwt: string,
 *   onSelectRoom: (roomId: number) => void,
 * }} props
 */
export function RoomList({ apiBaseUrl, jwt, onSelectRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadRooms = useCallback(
    async (p = 1) => {
      if (!apiBaseUrl || !jwt) return;
      setLoading(true);
      setError("");
      const result = await fetchRooms(apiBaseUrl, jwt, {
        page: p,
        pageSize: 10,
      });
      setLoading(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // The API may return { items: [...], totalPages, ... } or just an array
      const data = result.data;
      if (Array.isArray(data)) {
        setRooms(data);
        setTotalPages(1);
      } else {
        setRooms(data.items ?? data.data ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
      setPage(p);
    },
    [apiBaseUrl, jwt],
  );

  useEffect(() => {
    loadRooms(1);
  }, [loadRooms]);

  const langEmoji = (lang) => {
    switch (lang?.toLowerCase()) {
      case "english":
        return "🇬🇧";
      case "vietnamese":
        return "🇻🇳";
      case "chinese":
        return "🇨🇳";
      default:
        return "🌐";
    }
  };

  return (
    <div className="room-list">
      <div className="room-list-header">
        <h3>📋 Available Rooms</h3>
        <button
          className="btn-sm"
          onClick={() => loadRooms(page)}
          disabled={loading}
        >
          {loading ? "⏳" : "🔄"}
        </button>
      </div>

      {error && <div className="room-list-error">{error}</div>}

      {loading && rooms.length === 0 && (
        <div className="room-list-loading">Loading rooms...</div>
      )}

      {!loading && rooms.length === 0 && !error && (
        <div className="room-list-empty">
          No rooms found. Create one in the main app first.
        </div>
      )}

      <div className="room-list-items">
        {rooms.map((room) => (
          <button
            key={room.roomId}
            className="room-card"
            onClick={() => onSelectRoom(room.roomId)}
          >
            <div className="room-card-top">
              <span className="room-card-id">#{room.roomId}</span>
              <span className="room-card-lang">
                {langEmoji(room.languageType)} {room.languageType}
              </span>
            </div>
            <div className="room-card-name">{room.name || "Unnamed Room"}</div>
            <div className="room-card-meta">
              {room.roomType && (
                <span className="room-tag">{room.roomType}</span>
              )}
              {room.requiredLevel && (
                <span className="room-tag">{room.requiredLevel}</span>
              )}
              {room.topics?.map((t) => (
                <span key={t} className="room-tag topic">
                  {t}
                </span>
              ))}
            </div>
            {room.currentParticipantCount != null && (
              <div className="room-card-participants">
                👥 {room.currentParticipantCount}
                {room.maxParticipants ? ` / ${room.maxParticipants}` : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="room-list-pagination">
          <button
            className="btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => loadRooms(page - 1)}
          >
            ◀ Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn-sm"
            disabled={page >= totalPages || loading}
            onClick={() => loadRooms(page + 1)}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
}
