import test from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectRoutes,
  inspectRoutesFromFile,
  getPortMappings,
  getPortMappingsFromFile,
  findRouteByHost,
  findRouteByHostFromFile
} from "../src/index.js";
import * as v2 from "../src/v2/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, "fixtures/caddy.sample.json");

const mockConfig = {
  apps: {
    http: {
      servers: {
        srv0: {
          routes: [
            {
              match: [{ host: ["app.example.com"] }],
              handle: [
                {
                  handler: "subroute",
                  routes: [
                    {
                      match: [{ path: ["/api*"] }],
                      handle: [
                        {
                          handler: "reverse_proxy",
                          upstreams: [{ dial: "localhost:5000" }]
                        }
                      ]
                    },
                    {
                      handle: [
                        {
                          handler: "reverse_proxy",
                          upstreams: [{ dial: "localhost:3000" }]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              match: [{ host: ["static.example.com"] }],
              handle: [
                {
                  handler: "subroute",
                  routes: [
                    {
                      handle: [
                        { handler: "vars", root: "/var/www/static" },
                        { handler: "file_server" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  }
};

test("v2 inspectRoutes correctly extracts routes, targets, and upstreams", () => {
  const routes = inspectRoutes(mockConfig);
  assert.equal(routes.length, 2);

  const appRoute = routes[0];
  assert.deepEqual(appRoute.hosts, ["app.example.com"]);
  assert.equal(appRoute.server, "srv0");
  assert.equal(appRoute.targets.length, 2);
  assert.equal(appRoute.targets[0].type, "reverse_proxy");
  assert.deepEqual(appRoute.targets[0].dials, ["localhost:5000"]);
  assert.equal(appRoute.targets[0].path, "/api*");
  assert.equal(appRoute.targets[1].type, "reverse_proxy");
  assert.deepEqual(appRoute.targets[1].dials, ["localhost:3000"]);
  assert.equal(appRoute.targets[1].path, "*");

  const staticRoute = routes[1];
  assert.deepEqual(staticRoute.hosts, ["static.example.com"]);
  assert.equal(staticRoute.targets[0].type, "file_server");
  assert.equal(staticRoute.targets[0].root, "/var/www/static");
});

test("v2 getPortMappings extracts ports and maps to hostnames", () => {
  const mappings = getPortMappings(mockConfig);
  assert.equal(mappings.length, 3);

  const port5000 = mappings.find((m) => m.port === "5000");
  assert.ok(port5000);
  assert.equal(port5000.dial, "localhost:5000");
  assert.deepEqual(port5000.hosts, ["app.example.com"]);
  assert.equal(port5000.path, "/api*");

  const staticMapping = mappings.find((m) => m.type === "file_server");
  assert.ok(staticMapping);
  assert.equal(staticMapping.dial, "/var/www/static");
  assert.deepEqual(staticMapping.hosts, ["static.example.com"]);
});

test("v2 findRouteByHost finds route by case-insensitive hostname", () => {
  const route = findRouteByHost(mockConfig, "APP.EXAMPLE.COM");
  assert.ok(route);
  assert.deepEqual(route.hosts, ["app.example.com"]);
  assert.equal(route.server, "srv0");

  const notFound = findRouteByHost(mockConfig, "nonexistent.example.com");
  assert.equal(notFound, null);
});

test("v2 file-based operations against sample caddy file", () => {
  const routes = inspectRoutesFromFile(samplePath);
  assert.ok(routes.length > 0);

  const mappings = getPortMappingsFromFile(samplePath);
  assert.ok(mappings.length > 0);
  assert.ok(mappings.some((m) => m.hosts.includes("quotation.keshavsoft.com")));

  const quotation = findRouteByHostFromFile(samplePath, "quotation.keshavsoft.com");
  assert.ok(quotation);
  assert.ok(quotation.targets.some((t) => t.dials.includes("localhost:8080")));
  assert.ok(quotation.targets.some((t) => t.dials.includes("localhost:9011")));
});

test("v2 exports parity between root and ./src/v2/index.js", () => {
  assert.equal(typeof v2.inspectRoutes, "function");
  assert.equal(typeof v2.getPortMappings, "function");
  assert.equal(typeof v2.findRouteByHost, "function");
});
