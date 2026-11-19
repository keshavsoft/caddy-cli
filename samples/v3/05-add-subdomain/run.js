import { readCaddyConfig, addSubdomain, listSubdomains } from "../../../src/v3/index.js";
import { resolve } from "node:path";

const sampleFile = resolve(process.cwd(), "./samples/caddy.sample.json");
const config = readCaddyConfig(sampleFile);

console.log("=== Step 5: Add Subdomain (In-Memory) ===");
console.log("Initial Subdomains:", listSubdomains(config));

const result = addSubdomain(config, {
  domain: "billing.keshavsoft.com",
  port: 5000
});

console.log(`\n✅ Route added successfully at index: ${result.routeIndex}`);
console.log("Updated Subdomains in Config:");
console.log(listSubdomains(result.updatedConfig));
