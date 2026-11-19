import { readCaddyConfig, hasSubdomain } from "../../../src/v3/index.js";
import { resolve } from "node:path";

const sampleFile = resolve(process.cwd(), "./samples/caddy.sample.json");
const config = readCaddyConfig(sampleFile);

console.log("=== Step 3: Check Subdomain Collision ===");

const testDomains = [
  "quotation.keshavsoft.com",  // existing
  "billing.keshavsoft.com",    // new available
  "appointment.keshavsoft.com" // existing
];

for (const d of testDomains) {
  const exists = hasSubdomain(config, d);
  console.log(`Domain: '${d}' -> ${exists ? "❌ ALREADY CONFIGURED" : "✅ AVAILABLE TO ADD"}`);
}
