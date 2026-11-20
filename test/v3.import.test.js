import test from "node:test";
import assert from "node:assert/strict";
import * as v3 from "../src/v3/index.js";

/**
 * ============================================================================
 * V3 Import & Export Verification Test
 * Ensures v3 exports ONLY what is needed, with no unwanted default exports.
 * ============================================================================
 */

test("v3 exports only the required functions", () => {
  const expectedExports = [
    "readCaddyConfig",
    "writeCaddyConfig",
    "listSubdomains",
    "hasSubdomain",
    "buildProbeRoute",
    "addProbeSubdomain",
    "addProbeSubdomainToFile",
    "buildProxyRoute",
    "addSubdomain",
    "addSubdomainToFile"
  ].sort();

  const actualExports = Object.keys(v3).sort();

  assert.deepEqual(actualExports, expectedExports, "v3 exports must match exactly what is needed");
});

test("v3 has no unwanted default export", () => {
  assert.equal(v3.default, undefined, "v3 should not have an unwanted default export");
});

test("v3 exported functions have correct types", () => {
  assert.equal(typeof v3.readCaddyConfig, "function");
  assert.equal(typeof v3.writeCaddyConfig, "function");
  assert.equal(typeof v3.listSubdomains, "function");
  assert.equal(typeof v3.hasSubdomain, "function");
  assert.equal(typeof v3.buildProbeRoute, "function");
  assert.equal(typeof v3.addProbeSubdomain, "function");
  assert.equal(typeof v3.addProbeSubdomainToFile, "function");
  assert.equal(typeof v3.buildProxyRoute, "function");
  assert.equal(typeof v3.addSubdomain, "function");
  assert.equal(typeof v3.addSubdomainToFile, "function");
});

test("v3 functions can be imported individually via named destructuring", async () => {
  const {
    readCaddyConfig,
    listSubdomains,
    hasSubdomain,
    buildProbeRoute,
    addProbeSubdomain,
    addProbeSubdomainToFile,
    buildProxyRoute,
    addSubdomain,
    addSubdomainToFile
  } = await import("../src/v3/index.js");

  assert.ok(readCaddyConfig);
  assert.ok(listSubdomains);
  assert.ok(hasSubdomain);
  assert.ok(buildProbeRoute);
  assert.ok(addProbeSubdomain);
  assert.ok(addProbeSubdomainToFile);
  assert.ok(buildProxyRoute);
  assert.ok(addSubdomain);
  assert.ok(addSubdomainToFile);
});

test("root index.js hooks the highest version (v3)", async () => {
  const root = await import("../src/index.js");
  assert.equal(typeof root.addSubdomain, "function");
  assert.equal(typeof root.readCaddyConfig, "function");
  assert.equal(typeof root.buildProxyRoute, "function");
  assert.equal(typeof root.buildProbeRoute, "function");
});
