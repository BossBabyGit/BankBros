import fetchDejen from "./fetch-dejen.mjs";
import fetchCsGold from "./fetch-csgold.mjs";
import fetchCsBattle from "./fetch-csbattle.mjs";
import fetchRoulobets from "./fetch-roulobets.mjs";

(async () => {
  try { await fetchDejen(); }
  catch (e) { console.error("Dejen failed:", e?.message ?? e); }

  try { await fetchCsGold(); }
  catch (e) { console.error("CsGold failed:", e?.message ?? e); }

  try { await fetchCsBattle(); }
  catch (e) { console.error("CsBattle failed:", e?.message ?? e); }

  try { await fetchRoulobets(); }
  catch (e) { console.error("Roulobets failed:", e?.message ?? e); }

  console.log("✅ Leaderboards updated successfully");
})();
