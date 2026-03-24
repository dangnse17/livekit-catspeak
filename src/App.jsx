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

/* ════════════════════════════════════════════════════════════════
   App — thin orchestration shell
   ════════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── Form state ── */
  const [apiBaseUrl, setApiBaseUrl] = useState(env.apiBaseUrl);
  const [jwt, setJwt] = useState(env.jwt);
  const [loginEmail, setLoginEmail] = useState(env.loginEmail);
  const [loginPassword, setLoginPassword] = useState(env.loginPassword);
  const [roomId, setRoomId] = useState(env.roomId);
  const [participantName, setParticipantName] = useState("CatSpeak Demo User");
  const [participantIdentity, setParticipantIdentity] = useState("");

  /* ── Connection state ── */
  const [serverUrl, setServerUrl] = useState("");
  const [participantToken, setParticipantToken] = useState("");
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectTime, setConnectTime] = useState(null);
  const [preJoinRoomId, setPreJoinRoomId] = useState(null);
  const micCamRef = useRef({ micOn: false, cameraOn: false });

  const canLogin = useMemo(
    () => apiBaseUrl && loginEmail && loginPassword,
    [apiBaseUrl, loginEmail, loginPassword],
  );
  const canRequestToken = useMemo(() => apiBaseUrl && jwt, [apiBaseUrl, jwt]);
  const inRoom = connected && participantToken && serverUrl;

  /* ── Login handler (uses tokenService) ── */
  const handleLogin = useCallback(async () => {
    setError("");
    setStatus("Logging in...");
    if (!canLogin) {
      setError("API Base URL, email, and password are required.");
      setStatus("Failed");
      return;
    }
    const result = await loginAndGetJwt(apiBaseUrl, loginEmail, loginPassword);
    if (!result.success) {
      setError(result.error);
      setStatus("Failed");
      return;
    }
    setJwt(result.data.token);
    if (!participantName && result.data.user?.username) {
      setParticipantName(result.data.user.username);
    }
    setStatus("Logged in ✓");
  }, [apiBaseUrl, canLogin, loginEmail, loginPassword, participantName]);

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
  }, []);

  /* ── Select room from list → show pre-join ── */
  const handleSelectRoom = useCallback((selectedRoomId) => {
    setRoomId(String(selectedRoomId));
    setPreJoinRoomId(String(selectedRoomId));
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
  }, []);

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

        <Accordion title="🔌 Connection" defaultOpen={true}>
          <div className="form-grid">
            <label>
              API Base URL
              <input
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.catspeak.com.vn/"
              />
            </label>
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
            <label>
              JWT Token
              <input
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
                placeholder="Auto-filled by login, or paste manually"
              />
            </label>
          </div>
        </Accordion>

        <Accordion title="🏠 Room Settings" defaultOpen={true}>
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
        </Accordion>

        <button
          className="btn-gradient"
          disabled={!canRequestToken}
          onClick={handleGetTokenAndJoin}
        >
          🚀 Get Token & Join
        </button>

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
              Log in first, then browse rooms or enter a Room ID manually.
            </div>
            <div className="multi-tab-hint">
              💡 <strong>Multi-user testing:</strong> Open this page in multiple
              browser tabs (or incognito) and join with different names to test
              multi-participant calls.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
