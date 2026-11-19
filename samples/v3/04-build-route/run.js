import { buildProxyRoute } from "../../../src/v3/index.js";

console.log("=== Step 4: Build Caddy Route Block ===");

const domain = "billing.keshavsoft.com";
const port = 5000;

const routeBlock = buildProxyRoute(domain, port);

console.log(`Building route for: ${domain} -> localhost:${port}\n`);
console.log("Generated Caddy Route JSON:");
console.log(JSON.stringify(routeBlock, null, 2));
