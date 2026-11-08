import test from "node:test";
import assert from "node:assert/strict";
import extractHosts, { extractHostsFromFile, HOST_EXPRESSION } from "../src/index.js";
import * as v1 from "../src/v1/index.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, "fixtures/caddy.sample.json");

test("HOST_EXPRESSION is defined correctly", () => {
  assert.equal(HOST_EXPRESSION, "$..host[*]");
  assert.equal(v1.HOST_EXPRESSION, "$..host[*]");
});

test("extractHosts extracts hosts and paths from in-memory Caddy config", () => {
  const mockConfig = {
    apps: {
      http: {
        servers: {
          srv0: {
            routes: [
              {
                match: [{ host: ["example.com", "api.example.com"] }]
              }
            ]
          }
        }
      }
    }
  };

  const result = extractHosts(mockConfig);
  assert.deepEqual(result.hosts, ["example.com", "api.example.com"]);
  assert.deepEqual(result.uniqueHosts, ["example.com", "api.example.com"]);
  assert.equal(result.tableData.length, 2);
  assert.equal(result.tableData[0].host, "example.com");
});

test("extractHostsFromFile correctly parses sample caddy file", () => {
  const result = extractHostsFromFile(samplePath);

  assert.ok(result.uniqueHosts.length > 0);
  assert.ok(result.uniqueHosts.includes("quotation.keshavsoft.com"));
});

test("v1 matches root exports", () => {
  assert.equal(typeof v1.extractHosts, "function");
  assert.equal(typeof v1.extractHostsFromFile, "function");
});
