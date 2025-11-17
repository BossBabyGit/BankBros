import { useEffect, useState } from "react";

/**
 * useLeaderboardCountdown(target)
 * - target: string (ISO datetime with timezone offset, e.g. "2025-12-08T20:00:00-05:00")
 *           or number (ms since epoch) or Date instance.
 *
 * Returns { days, hours, minutes, seconds, expired }
 */
export default function useLeaderboardCountdown(target) {
  const toMs = (t) => {
    if (typeof t === "number") return Math.floor(t);
    if (t instanceof Date) return t.getTime();
    if (typeof t === "string") {
      const parsed = new Date(t);
      if (!isNaN(parsed)) return parsed.getTime();
    }
    return NaN;
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = toMs(target);
  if (Number.isNaN(targetMs)) {
    // invalid target → return zeroed countdown
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const diff = Math.max(0, targetMs - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const expired = diff === 0;

  return { days, hours, minutes, seconds, expired };
}
