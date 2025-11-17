// Countdown.js
import React from "react";
import useLeaderboardCountdown from "./useLeaderboardCountdown";

export default function Countdown({ label, targetIso }) {
  const { days, hours, minutes, seconds, expired } = useLeaderboardCountdown(targetIso);

  return (
    <div className="rounded-xl border border-white/10 bg-white/4 p-4 text-center min-w-[180px]">
      <div className="text-sm font-medium text-white/80">{label}</div>
      <div className="mt-2 text-2xl font-bold">
        {expired ? (
          <span>ENDED</span>
        ) : (
          <span>
            {days}d {String(hours).padStart(2, "0")}:
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-white/60">
        {expired ? "Leaderboard closed" : "Ends at target time (server tz shown by you)"}
      </div>
    </div>
  );
}
