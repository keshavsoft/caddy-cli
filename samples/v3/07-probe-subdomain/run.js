import { addProbeSubdomainToFile, readCaddyConfig } from "../../../src/v3/index.js";
import { resolve } from "node:path";
import { copyFileSync, unlinkSync } from "node:fs";

console.log("=== Step 7: Add Level-1 Smoke Test Probe ===");

const sourceSample = resolve(process.cwd(), "./samples/caddy.sample.json");
const testFile = resolve(process.cwd(), "./samples/v3/07-probe-subdomain/caddy.demo.json");
copyFileSync(sourceSample, testFile);

console.log(`Target config: ${testFile}`);

// Add probe route (static_response) for 'call.keshavsoft.com'
const result = addProbeSubdomainToFile(testFile, {
  domain: "call.keshavsoft.com",
  backup: true
});

console.log("\n🚀 Probe route created successfully!");
console.log(`📁 File updated: ${result.filePath}`);
console.log(`💾 Auto-backup saved: ${result.backupFile}`);
console.log("\nGenerated Route in Caddy JSON:");
console.log(JSON.stringify(result.newRoute, null, 2));

unlinkSync(testFile);
if (result.backupFile) unlinkSync(result.backupFile);
console.log("\n(Demo files cleaned up)");
