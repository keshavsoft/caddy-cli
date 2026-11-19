import { addSubdomainToFile, readCaddyConfig, listSubdomains } from "../../../src/v3/index.js";
import { resolve } from "node:path";
import { copyFileSync, unlinkSync } from "node:fs";

console.log("=== Step 6: Add Subdomain to File (With Auto-Backup) ===");

// Create a sandbox copy so we don't mutate the base sample
const sourceSample = resolve(process.cwd(), "./samples/caddy.sample.json");
const testFile = resolve(process.cwd(), "./samples/v3/06-add-to-file/caddy.demo.json");
copyFileSync(sourceSample, testFile);

console.log(`Working on demo file: ${testFile}`);

const result = addSubdomainToFile(testFile, {
  domain: "analytics.keshavsoft.com",
  port: 8000,
  backup: true
});

console.log("\n✅ Subdomain added successfully!");
console.log(`📁 File updated: ${result.filePath}`);
console.log(`💾 Auto-backup created: ${result.backupFile}`);

const reloaded = readCaddyConfig(testFile);
console.log("\nNew Subdomain List in File:");
console.log(listSubdomains(reloaded));

// Clean up demo files
unlinkSync(testFile);
if (result.backupFile) unlinkSync(result.backupFile);
console.log("\n(Demo test files cleaned up)");
