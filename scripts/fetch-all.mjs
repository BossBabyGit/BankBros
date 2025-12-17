import fetchMenace from "./fetch-menace.mjs";
import fetchCsGold from "./fetch-csgold.mjs";
import fetchCsBattle from "./fetch-csbattle.mjs";
import fetchRoulobets from "./fetch-roulobets.mjs";

(async () => {
  try { await fetchMenace(); }
  catch (e) { console.error("Menace failed:", e?.message ?? e); }

  console.log("✅ Leaderboards updated successfully");
})();
