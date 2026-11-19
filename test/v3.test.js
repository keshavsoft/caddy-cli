import test from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import {
  readCaddyConfig,
  listSubdomains,
  hasSubdomain,
  buildProxyRoute,
  addSubdomain,
  addSubdomainToFile
} from "../src/v3/index.js";

/**
 * ============================================================================
 * V3 Functionality & Behavior Test
 * Verifies the end-to-end story of adding subdomains to Caddy configurations.
 * ============================================================================
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, "fixtures/caddy.sample.json");

test("v3 reads Caddy config and lists subdomains", () => {
  const config = readCaddyConfig(samplePath);
  const domains = listSubdomains(config);

  assert.ok(domains.includes("quotation.keshavsoft.com"));
  assert.ok(domains.includes("cli.keshavsoft.com"));
  assert.ok(domains.includes("cc9.keshavsoft.com"));
});

test("v3 hasSubdomain correctly identifies existing domain", () => {
  const config = readCaddyConfig(samplePath);

  assert.equal(hasSubdomain(config, "QUOTATION.KESHAVSOFT.COM"), true);
  assert.equal(hasSubdomain(config, "nonexistent.example.com"), false);
});

test("v3 buildProxyRoute creates clean Caddy reverse_proxy route", () => {
  const route = buildProxyRoute("api.keshavsoft.com", 4000);

  assert.deepEqual(route.match[0].host, ["api.keshavsoft.com"]);
  assert.equal(route.terminal, true);
  assert.equal(route.handle[0].handler, "subroute");
});

test("v3 addSubdomain safely appends new subdomain", () => {
  const config = readCaddyConfig(samplePath);
  const initialCount = config.apps.http.servers.srv0.routes.length;

  const result = addSubdomain(config, {
    domain: "billing.keshavsoft.com",
    port: 5050
  });

  assert.equal(result.routeIndex, initialCount);
  assert.equal(hasSubdomain(result.updatedConfig, "billing.keshavsoft.com"), true);
});

test("v3 addSubdomain prevents duplicate without force", () => {
  const config = readCaddyConfig(samplePath);

  assert.throws(() => {
    addSubdomain(config, {
      domain: "cc9.keshavsoft.com",
      port: 3001
    });
  }, /already configured/);

  // With force
  const result = addSubdomain(config, {
    domain: "cc9.keshavsoft.com",
    port: 3001,
    force: true
  });
  assert.ok(result);
});

test("v3 addSubdomainToFile writes file and creates backup", () => {
  const tempPath = resolve(__dirname, "fixtures/caddy.temp.json");
  const initialConfig = readCaddyConfig(samplePath);
  writeFileSync(tempPath, JSON.stringify(initialConfig, null, 2), "utf8");

  try {
    const result = addSubdomainToFile(tempPath, {
      domain: "temp-app.keshavsoft.com",
      port: 7000,
      backup: true
    });

    assert.ok(result.backupFile, "Backup file should be created");
    assert.ok(existsSync(result.backupFile), "Backup file must exist on disk");

    const reloaded = readCaddyConfig(tempPath);
    assert.equal(hasSubdomain(reloaded, "temp-app.keshavsoft.com"), true);

    // Clean up backup file
    if (result.backupFile && existsSync(result.backupFile)) {
      unlinkSync(result.backupFile);
    }
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
});
