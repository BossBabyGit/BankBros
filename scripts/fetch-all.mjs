// scripts/fetch-all.mjs
import { spawn } from "node:child_process";

function run(nodeFile) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nodeFile], { stdio: "inherit" });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${nodeFile} exited ${code}`))));
  });
}

await run(new URL("./fetch-dejen.mjs", import.meta.url).pathname);
await run(new URL("./fetch-csgold.mjs", import.meta.url).pathname);
console.log("✅ Leaderboards updated successfully");
