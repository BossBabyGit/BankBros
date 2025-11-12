import { useEffect, useState } from "react";

export default function useLeaderboardCountdown() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ✅ 30 November 2025, 00:00 UTC
  const targetMs = Date.UTC(2025, 10, 30, 0, 0, 0); 
  //                year, monthIndex (0=Jan → 10=Nov), day, hour, min, sec

  const diff = Math.max(0, targetMs - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
}
