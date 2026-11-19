import { readCaddyConfig } from "../../../src/v3/index.js";
import { resolve } from "node:path";

const sampleFile = resolve(process.cwd(), "./samples/caddy.sample.json");

console.log("=== Step 1: Read Caddy Config ===");
console.log(`Reading from: ${sampleFile}\n`);

const config = readCaddyConfig(sampleFile);
const serverKeys = Object.keys(config?.apps?.http?.servers || {});

console.log("Caddy Servers Found:", serverKeys);
console.log("Listening on:", config?.apps?.http?.servers?.srv0?.listen);
console.log("Total Routes Configured:", config?.apps?.http?.servers?.srv0?.routes?.length);
