import { useEffect, useState } from "react";

/**
 * ConnectionTimer — displays elapsed time since connection started.
 */
export function ConnectionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return <span className="connection-timer">⏱ {elapsed}</span>;
}
