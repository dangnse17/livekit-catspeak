import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { StatusBadge } from "./components/StatusBadge";
import { RoomInner } from "./components/RoomInner";
import { RoomList } from "./components/RoomList";
import { PreJoinScreen } from "./components/PreJoinScreen";
import { loginAndGetJwt, requestLiveKitToken } from "./services/tokenService";
import { MAX_PARTICIPANTS } from "./constants/livekit";

const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5051",
  jwt: import.meta.env.VITE_DEMO_JWT ?? "",
  roomId: import.meta.env.VITE_DEFAULT_ROOM_ID ?? "",
  loginEmail: import.meta.env.VITE_DEMO_LOGIN_EMAIL ?? "",
  loginPassword: import.meta.env.VITE_DEMO_LOGIN_PASSWORD ?? "",
};

/* ── Accordion (local UI helper) ── */
function Accordion({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion ${open ? "open" : ""}`}>
      <button
        className="accordion-header"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {title}
        <span className="accordion-chevron">▼</span>
      </button>
      <div className="accordion-body">{children}</div>
    </div>
  );
}

/* ── JWT helpers ── */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
}

/* ── Path routing helpers ── */
function parseRoomFromPath() {
  const match = window.location.pathname.match(/^\/room\/(\d+)/);
  return match ? match[1] : null;
}

function setPath(path) {
  window.history.replaceState(null, "", path ? `/${path}` : "/");
}

export default function App() {
  /* ── Form state (restore from localStorage) ── */
  const [apiBaseUrl, setApiBaseUrl] = useState(env.apiBaseUrl);
  const [jwt, setJwt] = useState(() => {
    const stored = localStorage.getItem("catspeak_jwt");
    if (stored && !isTokenExpired(stored)) return stored;
    localStorage.removeItem("catspeak_jwt");
    localStorage.removeItem("catspeak_username");
    return env.jwt;
  });
  const [loginEmail, setLoginEmail] = useState(env.loginEmail);
  const [loginPassword, setLoginPassword] = useState(env.loginPassword);
  const [roomId, setRoomId] = useState(env.roomId);
  const [participantName, setParticipantName] = useState(
    () => localStorage.getItem("catspeak_username") || "",
  );
  const [participantIdentity, setParticipantIdentity] = useState("");

  /* ── Connection state ── */
  const [serverUrl, setServerUrl] = useState("");
  const [participantToken, setParticipantToken] = useState("");
  const [status, setStatus] = useState(() =>
    localStorage.getItem("catspeak_jwt") &&
    !isTokenExpired(localStorage.getItem("catspeak_jwt"))
      ? "Logged in ✓"
      : "Idle",
  );
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectTime, setConnectTime] = useState(null);
  const [preJoinRoomId, setPreJoinRoomId] = useState(null);
  const micCamRef = useRef({ micOn: false, cameraOn: false });

  /* ── Pending room from share link (for login redirect) ── */
  const [pendingRoomId, setPendingRoomId] = useState(() => parseRoomFromPath());

  const isLoggedIn = jwt && !isTokenExpired(jwt);

  const canLogin = useMemo(
    () => apiBaseUrl && loginEmail && loginPassword,
    [apiBaseUrl, loginEmail, loginPassword],
  );
  const canRequestToken = useMemo(() => apiBaseUrl && jwt, [apiBaseUrl, jwt]);
  const inRoom = connected && participantToken && serverUrl;

  /* ── Login handler ── */
  const handleLogin = useCallback(async () => {
    setError("");
    setStatus("Logging in...");
    if (!canLogin) {
      setError("Email and password are required.");
      setStatus("Failed");
      return;
    }
    const result = await loginAndGetJwt(apiBaseUrl, loginEmail, loginPassword);
    if (!result.success) {
      setError(result.error);
      setStatus("Failed");
      return;
    }
    const token = result.data.token;
    const username = result.data.user?.username || "";
    setJwt(token);
    setParticipantName(username);
    localStorage.setItem("catspeak_jwt", token);
    if (username) localStorage.setItem("catspeak_username", username);
    setStatus("Logged in ✓");

    // If user arrived via share link, go to pre-join
    const pending = pendingRoomId || parseRoomFromPath();
    if (pending) {
      setPendingRoomId(null);
      setRoomId(pending);
      setPreJoinRoomId(pending);
      setPath(`room/${pending}`);
    }
  }, [apiBaseUrl, canLogin, loginEmail, loginPassword, pendingRoomId]);

  /* ── Logout handler ── */
  const handleLogout = useCallback(() => {
    setJwt("");
    setParticipantName("");
    setPreJoinRoomId(null);
    setError("");
    setStatus("Idle");
    localStorage.removeItem("catspeak_jwt");
    localStorage.removeItem("catspeak_username");
  }, []);

  /* ── Token request handler (uses tokenService) ── */
  const requestToken = useCallback(
    async (overrideRoomId) => {
      const effectiveRoomId = overrideRoomId ?? roomId;
      setError("");
      setStatus("Requesting token...");
      if (!apiBaseUrl || !jwt) {
        setError("API Base URL and JWT are required.");
        setStatus("Failed");
        return;
      }
      const result = await requestLiveKitToken(apiBaseUrl, jwt, {
        participantName,
        participantIdentity,
        roomId: effectiveRoomId,
      });
      if (!result.success) {
        setError(result.error);
        setStatus("Failed");
        return;
      }
      setServerUrl(result.data.server_url);
      setParticipantToken(result.data.participant_token);
      setStatus("Token ready");
    },
    [apiBaseUrl, jwt, participantName, participantIdentity, roomId],
  );

  /* ── Get Token & Join flow ── */
  const pendingJoin = useRef(false);

  const handleGetTokenAndJoin = useCallback(async () => {
    pendingJoin.current = true;
    await requestToken();
  }, [requestToken]);

  useEffect(() => {
    if (pendingJoin.current && participantToken && serverUrl) {
      pendingJoin.current = false;
      setConnected(true);
      setConnectTime(Date.now());
      setStatus("Connected");
    }
  }, [participantToken, serverUrl]);

  /* ── Leave room ── */
  const leaveRoom = useCallback((reason) => {
    setConnected(false);
    setParticipantToken("");
    setServerUrl("");
    setConnectTime(null);
    setStatus("Idle");
    setError(reason || "");
    setPath("");
  }, []);

  /* ── Select room from list → show pre-join ── */
  const handleSelectRoom = useCallback((selectedRoomId) => {
    setRoomId(String(selectedRoomId));
    setPreJoinRoomId(String(selectedRoomId));
    setPath(`room/${selectedRoomId}`);
  }, []);

  /* ── Confirm join from pre-join screen ── */
  const handleConfirmJoin = useCallback(
    async ({ micOn, cameraOn }) => {
      const id = preJoinRoomId;
      setPreJoinRoomId(null);
      pendingJoin.current = true;
      // Store mic/cam preferences in a ref so LiveKitRoom can use them
      micCamRef.current = { micOn, cameraOn };
      await requestToken(String(id));
    },
    [preJoinRoomId, requestToken],
  );

  const handleBackFromPreJoin = useCallback(() => {
    setPreJoinRoomId(null);
    setPath("");
  }, []);

  /* ── On mount: if logged in and hash has room, go to pre-join ── */
  useEffect(() => {
    const hashRoomId = parseRoomFromPath();
    if (hashRoomId && isLoggedIn && !preJoinRoomId && !inRoom) {
      setRoomId(hashRoomId);
      setPreJoinRoomId(hashRoomId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Listen for hash changes (browser back/forward) ── */
  useEffect(() => {
    const onHashChange = () => {
      const hashRoomId = parseRoomFromPath();
      if (hashRoomId && isLoggedIn) {
        setRoomId(hashRoomId);
        setPreJoinRoomId(hashRoomId);
      } else if (!hashRoomId) {
        setPreJoinRoomId(null);
      }
    };
    window.addEventListener("popstate", onHashChange);
    return () => window.removeEventListener("popstate", onHashChange);
  }, [isLoggedIn]);

  /* ── Render ── */
  return (
    <div className={`app-shell ${inRoom ? "in-room" : ""}`}>
      {/* ── Settings Panel ── */}
      <div className="settings-panel glass">
        <div className="logo-area">
          <span className="logo-icon">🐾</span>
          <h1>CatSpeak</h1>
          <span className="version">MVP v0.3</span>
        </div>

        {jwt && !isTokenExpired(jwt) ? (
          <div className="logged-in-card">
            <div className="logged-in-info">
              <span className="logged-in-avatar">
                {participantName?.charAt(0)?.toUpperCase() || "?"}
              </span>
              <div>
                <div className="logged-in-name">
                  {participantName || "User"}
                </div>
                <div className="logged-in-status">Logged in</div>
              </div>
            </div>
            <button className="btn-danger btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <Accordion title="Login" defaultOpen={true}>
            <div className="form-grid">
              <div className="form-row">
                <label>
                  Email
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                  />
                </label>
              </div>
              <div className="button-row">
                <button
                  className="btn-primary"
                  disabled={!canLogin}
                  onClick={handleLogin}
                >
                  Login
                </button>
              </div>
            </div>
          </Accordion>
        )}

        {/* <Accordion title="🏠 Room Settings" defaultOpen={true}>
          <div className="form-grid">
            <label>
              Room ID
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="1"
              />
            </label>
            <div className="form-row">
              <label>
                Your Name
                <input
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="CatSpeak User"
                />
              </label>
              <label>
                Identity
                <input
                  value={participantIdentity}
                  onChange={(e) => setParticipantIdentity(e.target.value)}
                  placeholder="auto"
                />
              </label>
            </div>
            <div className="capacity-info">
              Room capacity: <strong>{MAX_PARTICIPANTS}</strong> participants
            </div>
          </div>
        </Accordion> */}

        {/* <button
          className="btn-gradient"
          disabled={!canRequestToken}
          onClick={handleGetTokenAndJoin}
        >
          🚀 Get Token & Join
        </button> */}

        <StatusBadge status={status} error={error} serverUrl={serverUrl} />
      </div>

      {/* ── Main Stage ── */}
      <div className="main-stage glass">
        {participantToken && serverUrl ? (
          <LiveKitRoom
            serverUrl={serverUrl}
            token={participantToken}
            connect={connected}
            data-lk-theme="default"
            video={micCamRef.current.cameraOn}
            audio={micCamRef.current.micOn}
            onConnected={() => {
              if (!connectTime) setConnectTime(Date.now());
              setStatus("Connected");
            }}
            onDisconnected={() => {
              setConnected(false);
              setStatus("Disconnected");
              setConnectTime(null);
            }}
            onError={(e) => setError(e?.message || "LiveKit connection error")}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              height: "100%",
            }}
          >
            {connected ? (
              <RoomInner
                roomName={`Room ${roomId || "?"}`}
                connectTime={connectTime}
                onLeave={leaveRoom}
              />
            ) : (
              <div className="stage-placeholder">
                <div className="placeholder-icon">📡</div>
                <div className="placeholder-title">Token acquired!</div>
                <button
                  className="btn-gradient"
                  style={{ maxWidth: 260 }}
                  onClick={() => {
                    setConnected(true);
                    setConnectTime(Date.now());
                    setStatus("Connected");
                  }}
                >
                  Join Room
                </button>
              </div>
            )}
          </LiveKitRoom>
        ) : preJoinRoomId ? (
          <PreJoinScreen
            apiBaseUrl={apiBaseUrl}
            jwt={jwt}
            roomId={preJoinRoomId}
            participantName={participantName}
            onJoin={handleConfirmJoin}
            onBack={handleBackFromPreJoin}
          />
        ) : jwt ? (
          <RoomList
            apiBaseUrl={apiBaseUrl}
            jwt={jwt}
            onSelectRoom={handleSelectRoom}
          />
        ) : (
          <div className="stage-placeholder">
            <div className="placeholder-icon">🐾</div>
            <div className="placeholder-title">Ready to Connect</div>
            <div className="placeholder-hint">
              {pendingRoomId
                ? `Log in to join Room #${pendingRoomId}`
                : "Log in first before joining the video call."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
