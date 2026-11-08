import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { query, paths } from "jsonpathly";

export const HOST_EXPRESSION = "$..host[*]";

/**
 * Extract hostnames and JSON paths from a parsed Caddy configuration object.
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
 * Read and parse a Caddy JSON file, then extract hosts.
 * @param {string} filePath - Path to caddy.json file.
 * @returns {{ hosts: string[], hostPaths: string[], uniqueHosts: string[], tableData: Array<{host: string, path: string}> }}
 */
export function extractHostsFromFile(filePath) {
  const resolvedPath = resolve(process.cwd(), filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = readFileSync(resolvedPath, "utf8");
  let caddy;
  try {
    caddy = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${resolvedPath}: ${err.message}`);
  }

  return extractHosts(caddy);
}

export default extractHosts;

