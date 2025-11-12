// scripts/fetch-all.mjs
import fetchDejen from "./fetch-dejen.mjs";
import fetchCsGold from "./fetch-csgold.mjs";

let ok = false;

try {
  await fetchDejen();
  ok = true;
} catch (e) {
  console.error("Dejen failed:", e.message);
}

try {
  await fetchCsGold();
  ok = true;
} catch (e) {
  console.error("CsGold failed:", e.message);
}

if (!ok) {
  console.error("❌ Both fetches failed");
  process.exit(1);
} else {
  console.log("✅ Leaderboards updated successfully");
}
