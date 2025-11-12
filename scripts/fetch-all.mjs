import fetchDejen from "./fetch-dejen.mjs";
import fetchCsGold from "./fetch-csgold.mjs";

(async () => {
  try { await fetchDejen(); }
  catch (e) { console.error("Dejen failed:", e?.message ?? e); }

  try { await fetchCsGold(); }
  catch (e) { console.error("CsGold failed:", e?.message ?? e); }

  console.log("✅ Leaderboards updated successfully");
})();
