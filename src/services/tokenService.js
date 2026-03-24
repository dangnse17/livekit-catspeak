/**
 * Token & authentication service — pure functions, no React dependencies.
 */

/**
 * @param {string} apiBaseUrl
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, data?: {token: string, user?: object}, error?: string}>}
 */
export async function loginAndGetJwt(apiBaseUrl, email, password) {
  try {
    const res = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/Auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Login failed (${res.status}): ${text}` };
    }
    const data = await res.json();
    const token = data?.token;
    if (!token) {
      return { success: false, error: "JWT not found in response." };
    }
    return { success: true, data: { token, user: data?.user } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Request a LiveKit token to join a room.
 * The backend maps roomId → LiveKit room name internally.
 * No separate "session" concept needed — LiveKit handles session lifecycle.
 *
 * @param {string} apiBaseUrl
 * @param {string} jwt
 * @param {{participantName?: string, participantIdentity?: string, roomId?: number}} params
 * @returns {Promise<{success: boolean, data?: {server_url: string, participant_token: string}, error?: string}>}
 */
export async function requestLiveKitToken(apiBaseUrl, jwt, params) {
  try {
    const body = {
      participantName: params.participantName || undefined,
      participantIdentity: params.participantIdentity || undefined,
      roomId: params.roomId ? Number(params.roomId) : undefined,
    };

    const res = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/livekit/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Token request failed (${res.status}): ${text}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        server_url: data.server_url ?? "",
        participant_token: data.participant_token ?? "",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Check current participant count in a room (optional backend endpoint).
 * Falls back gracefully if the endpoint doesn't exist.
 *
 * @param {string} apiBaseUrl
 * @param {string} jwt
 * @param {string} roomName
 * @returns {Promise<{success: boolean, data?: {count: number}, error?: string}>}
 */
export async function checkParticipantCount(apiBaseUrl, jwt, roomName) {
  try {
    const res = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/livekit/rooms/${encodeURIComponent(roomName)}/participants`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );
    if (!res.ok) {
      // Endpoint may not exist yet — treat as unknown
      return { success: false, error: `Cannot check count (${res.status})` };
    }
    const data = await res.json();
    return { success: true, data: { count: data.count ?? data.length ?? 0 } };
  } catch {
    return { success: false, error: "Participant count endpoint unavailable" };
  }
}

/**
 * Fetch the list of available rooms from the CatSpeak backend.
 *
 * @param {string} apiBaseUrl
 * @param {string} jwt
 * @param {{page?: number, pageSize?: number}} [options]
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function fetchRooms(apiBaseUrl, jwt, options = {}) {
  try {
    const { page = 1, pageSize = 20 } = options;
    const params = new URLSearchParams({ page, pageSize });

    const res = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/rooms?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Fetch rooms failed (${res.status}): ${text}` };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch a single room by ID.
 *
 * @param {string} apiBaseUrl
 * @param {string} jwt
 * @param {number|string} roomId
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function fetchRoomById(apiBaseUrl, jwt, roomId) {
  try {
    const res = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/rooms/${roomId}`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Fetch room failed (${res.status}): ${text}`,
      };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
