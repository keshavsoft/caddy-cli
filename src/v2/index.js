import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { query, paths } from "jsonpathly";

export const HOST_EXPRESSION = "$..host[*]";

/**
 * Extract hostnames and JSON paths from a parsed Caddy configuration object (v1 compatibility).
 * @param {object} caddyConfig - The parsed Caddy JSON configuration.
 * @returns {{ hosts: string[], hostPaths: string[], uniqueHosts: string[], tableData: Array<{host: string, path: string}> }}
 */
export function extractHosts(caddyConfig) {
  if (!caddyConfig || typeof caddyConfig !== "object") {
    throw new Error("Invalid Caddy configuration: expected an object");
  }

  const hosts = query(caddyConfig, HOST_EXPRESSION, {
    returnArray: true
  }) || [];

  const hostPaths = paths(caddyConfig, HOST_EXPRESSION) || [];

  const tableData = hosts.map((host, index) => ({
    host,
    path: hostPaths[index]
  }));

  const uniqueHosts = [...new Set(hosts)];

  return {
    hosts,
    hostPaths,
    uniqueHosts,
    tableData
  };
}

/**
 * Inspect all HTTP servers and routes in a Caddy configuration object.
 * Extracts hosts, handler types (reverse_proxy, file_server, etc.), upstream ports/dials, and paths.
 * @param {object} caddyConfig - The parsed Caddy JSON configuration.
 * @returns {Array<{ server: string, routeIndex: number, hosts: string[], targets: Array<{ type: string, dials: string[], root?: string, path: string }>, rawRoute: object }>}
 */
export function inspectRoutes(caddyConfig) {
  if (!caddyConfig || typeof caddyConfig !== "object") {
    throw new Error("Invalid Caddy configuration: expected an object");
  }

  const servers = caddyConfig?.apps?.http?.servers || {};
  const results = [];

  for (const [srvName, srv] of Object.entries(servers)) {
    const routes = srv.routes || [];
    routes.forEach((route, routeIdx) => {
      const hosts = [];
      (route.match || []).forEach((m) => {
        if (Array.isArray(m.host)) {
          hosts.push(...m.host);
        }
      });

      const targets = [];
      let rootDir = "";

      function parseHandlers(handles, currentPath = "*") {
        (handles || []).forEach((h) => {
          if (h.handler === "vars" && h.root) {
            rootDir = h.root;
          }
          if (h.handler === "reverse_proxy") {
            const dials = (h.upstreams || []).map((u) => u.dial).filter(Boolean);
            targets.push({ type: "reverse_proxy", dials, path: currentPath });
          } else if (h.handler === "file_server") {
            targets.push({ type: "file_server", dials: [], root: rootDir, path: currentPath });
          } else if (h.handler === "subroute") {
            (h.routes || []).forEach((sub) => {
              const subPaths = [];
              (sub.match || []).forEach((m) => {
                if (Array.isArray(m.path)) subPaths.push(...m.path);
              });
              const p = subPaths.length ? subPaths.join(", ") : "*";
              parseHandlers(sub.handle, p);
            });
          }
        });
      }

      parseHandlers(route.handle);

      if (hosts.length > 0) {
        results.push({
          server: srvName,
          routeIndex: routeIdx,
          hosts,
          targets,
          rawRoute: route
        });
      }
    });
  }

  return results;
}

/**
 * Extract port and upstream dial mappings grouped by target.
 * @param {object} caddyConfig
 * @returns {Array<{ port: string, dial: string, hosts: string[], path: string, type: string }>}
 */
export function getPortMappings(caddyConfig) {
  const routes = inspectRoutes(caddyConfig);
  const mappings = [];

  for (const r of routes) {
    for (const t of r.targets) {
      if (t.type === "reverse_proxy" && t.dials.length > 0) {
        for (const dial of t.dials) {
          const portMatch = dial.match(/:(\d+)$/);
          const port = portMatch ? portMatch[1] : dial;
          mappings.push({
            port,
            dial,
            hosts: r.hosts,
            path: t.path,
            type: "reverse_proxy"
          });
        }
      } else if (t.type === "file_server") {
        mappings.push({
          port: "static",
          dial: t.root || "file_server",
          hosts: r.hosts,
          path: t.path,
          type: "file_server"
        });
      }
    }
  }

  return mappings;
}

/**
 * Find and return the route configuration for a specific host/subdomain.
 * @param {object} caddyConfig
 * @param {string} targetHost
 * @returns {{ server: string, routeIndex: number, hosts: string[], targets: Array<{ type: string, dials: string[], root?: string, path: string }>, rawRoute: object } | null}
 */
export function findRouteByHost(caddyConfig, targetHost) {
  if (!targetHost || typeof targetHost !== "string") {
    throw new Error("Target host must be a non-empty string");
  }

  const normalized = targetHost.trim().toLowerCase();
  const routes = inspectRoutes(caddyConfig);

  return routes.find((r) => r.hosts.some((h) => h.toLowerCase() === normalized)) || null;
}

/**
 * Read and parse a Caddy JSON file, then extract hosts (v1 compatibility).
 * @param {string} filePath - Path to caddy.json file.
 */
export function extractHostsFromFile(filePath) {
  const caddy = loadCaddyFile(filePath);
  return extractHosts(caddy);
}

/**
 * Read and parse a Caddy JSON file, then inspect all routes.
 * @param {string} filePath - Path to caddy.json file.
 */
export function inspectRoutesFromFile(filePath) {
  const caddy = loadCaddyFile(filePath);
  return inspectRoutes(caddy);
}

/**
 * Read and parse a Caddy JSON file, then extract port mappings.
 * @param {string} filePath - Path to caddy.json file.
 */
export function getPortMappingsFromFile(filePath) {
  const caddy = loadCaddyFile(filePath);
  return getPortMappings(caddy);
}

/**
 * Read and parse a Caddy JSON file, then find a route by hostname.
 * @param {string} filePath - Path to caddy.json file.
 * @param {string} targetHost - Hostname to search for.
 */
export function findRouteByHostFromFile(filePath, targetHost) {
  const caddy = loadCaddyFile(filePath);
  return findRouteByHost(caddy, targetHost);
}

/**
 * Helper to safely load and parse a JSON file.
 * @param {string} filePath
 * @returns {object}
 */
export function loadCaddyFile(filePath) {
  const resolvedPath = resolve(process.cwd(), filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = readFileSync(resolvedPath, "utf8");
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${resolvedPath}: ${err.message}`);
  }
}

extractHosts.extractHosts = extractHosts;
extractHosts.HOST_EXPRESSION = HOST_EXPRESSION;
extractHosts.inspectRoutes = inspectRoutes;
extractHosts.getPortMappings = getPortMappings;
extractHosts.findRouteByHost = findRouteByHost;
extractHosts.extractHostsFromFile = extractHostsFromFile;
extractHosts.inspectRoutesFromFile = inspectRoutesFromFile;
extractHosts.getPortMappingsFromFile = getPortMappingsFromFile;
extractHosts.findRouteByHostFromFile = findRouteByHostFromFile;
extractHosts.loadCaddyFile = loadCaddyFile;

export default extractHosts;
