import { readCaddyConfig, listSubdomains } from "../../../src/v3/index.js";
import { resolve } from "node:path";

const sampleFile = resolve(process.cwd(), "./samples/caddy.sample.json");
const config = readCaddyConfig(sampleFile);

console.log("=== Step 2: List All Subdomains ===");
const domains = listSubdomains(config);

console.log(`Found ${domains.length} configured subdomains:\n`);
domains.forEach((domain, idx) => {
  console.log(`  ${idx + 1}. ${domain}`);
});
