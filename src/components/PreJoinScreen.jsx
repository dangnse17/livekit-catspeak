import { useState, useEffect, useRef, useCallback } from "react";
import { fetchRoomById } from "../services/tokenService";

/**
 * PreJoinScreen — Google Meet-style lobby before joining the call.
 * Shows room info, participant count, camera preview, and mic/cam toggles.
 */
export function PreJoinScreen({
  apiBaseUrl,
  jwt,
  roomId,
  participantName,
  onJoin,
  onBack,
}) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  // Fetch room info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await fetchRoomById(apiBaseUrl, jwt, roomId);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRoom(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, jwt, roomId]);

  // Camera preview
  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (cameraOn) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [cameraOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mic monitoring (loopback so user hears themselves)
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [micLevel, setMicLevel] = useState(0);

  const startMic = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = s;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(s);

      // Loopback: let user hear their own voice
      // Use a small gain to avoid feedback if speakers are used
      const gain = ctx.createGain();
      gain.gain.value = 0.8;
      source.connect(gain);
      gain.connect(ctx.destination);

      // Volume meter
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(avg / 128, 1));
        requestAnimationFrame(poll);
      };
      poll();
    } catch {
      setMicOn(false);
    }
  }, []);

  const stopMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  }, []);

  useEffect(() => {
    if (micOn) {
      startMic();
    } else {
      stopMic();
    }
  }, [micOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = () => {
    // Stop the preview stream before joining (LiveKit will create its own)
    stopCamera();
    stopMic();
    onJoin({ micOn, cameraOn });
  };

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

  if (loading) {
    return (
      <div className="prejoin-screen">
        <div className="prejoin-loading">Loading room info...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prejoin-screen">
        <div className="prejoin-error">
          <p>{error}</p>
          <button className="btn-ghost" onClick={onBack}>
            ← Back to rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prejoin-screen">
      <div className="prejoin-content">
        {/* Camera Preview */}
        <div className="prejoin-preview">
          {cameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="prejoin-video"
            />
          ) : (
            <div className="prejoin-video-off">
              <div className="prejoin-avatar">
                {participantName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="prejoin-cam-off-label">Camera is off</span>
            </div>
          )}
        </div>

        {/* Room Info */}
        <div className="prejoin-info">
          <div className="prejoin-room-header">
            <span className="prejoin-room-id">#{roomId}</span>
            {room?.languageType && (
              <span className="prejoin-lang">
                {langEmoji(room.languageType)} {room.languageType}
              </span>
            )}
          </div>

          <h2 className="prejoin-room-name">
            {room?.name || `Room ${roomId}`}
            <button
              className="btn-sm btn-ghost prejoin-share-btn"
              onClick={copyLink}
              title="Copy invite link"
            >
              {copied ? "✅ Copied!" : "🔗 Share"}
            </button>
          </h2>

          {/* Meta tags */}
          {(room?.roomType || room?.requiredLevel || room?.topics?.length > 0) && (
            <div className="prejoin-tags">
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
          )}

          {/* Participant count */}
          <div className="prejoin-participants">
            <span className="prejoin-participant-icon">👥</span>
            <span>
              {room?.currentParticipantCount ?? 0}
              {room?.maxParticipants
                ? ` / ${room.maxParticipants} participants`
                : " participants"}{" "}
              in this room
            </span>
          </div>

          {/* Mic / Cam toggles */}
          <div className="prejoin-controls">
            <button
              className={`prejoin-toggle ${micOn ? "active" : "off"}`}
              onClick={() => setMicOn((v) => !v)}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              <span className="toggle-icon">{micOn ? "🎙️" : "🔇"}</span>
              <span className="toggle-label">
                {micOn ? "Mic on" : "Mic off"}
              </span>
              {micOn && (
                <span className="mic-level-bar">
                  <span
                    className="mic-level-fill"
                    style={{ width: `${micLevel * 100}%` }}
                  />
                </span>
              )}
            </button>

            <button
              className={`prejoin-toggle ${cameraOn ? "active" : "off"}`}
              onClick={() => setCameraOn((v) => !v)}
              title={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              <span className="toggle-icon">{cameraOn ? "📹" : "📷"}</span>
              <span className="toggle-label">
                {cameraOn ? "Cam on" : "Cam off"}
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="prejoin-actions">
            <button className="btn-ghost" onClick={onBack}>
              ← Back
            </button>
            <button className="btn-gradient prejoin-join-btn" onClick={handleJoin}>
              Join now
            </button>
          </div>

          <div className="prejoin-hint">
            Joining as <strong>{participantName || "Guest"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
