import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  inspectRoutesFromFile,
  getPortMappingsFromFile,
  findRouteByHostFromFile,
  extractHostsFromFile
} from "./index.js";

/**
 * Get current package version from package.json
 * @returns {string}
 */
export function getVersion() {
  try {
    const pkgUrl = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf8"));
    return pkg.version || "1.2.0";
  } catch {
    return "1.2.0";
  }
}

/**
 * Print CLI help message
 */
export function printHelp() {
  console.log(`
caddy-cli (v${getVersion()})
Fast Caddy JSON inspection CLI for subdomains, upstream ports, and routes.

Usage:
  npx caddy-cli [options] [path/to/caddy.json]
  npx caddy-cli [domain] [path/to/caddy.json]

Options:
  -h, --help            Show this help message
  -v, --version         Show version number
  -u, --unique          Print only unique hostnames (one per line)
  -p, --ports           Display port and upstream dial target mappings
  -d, --domain <host>   Inspect the complete configuration route for a specific subdomain
  --json                Output results as formatted JSON

Arguments:
  [path]                Path to caddy.json (defaults to ./caddy.json in current directory)
  [domain]              Direct subdomain lookup (shorthand for -d <domain>)

Examples:
  npx caddy-cli
  npx caddy-cli -p
  npx caddy-cli -d quotation.keshavsoft.com
  npx caddy-cli cc9.keshavsoft.com --json
  npx caddy-cli --ports /etc/caddy/caddy.json
  npx caddy-cli --unique
`);
}

/**
 * Main CLI runner
 * @param {string[]} args
 */
export function run(args = process.argv.slice(2)) {
  let filePath = null;
  let targetDomain = null;
  let jsonMode = false;
  let uniqueOnly = false;
  let portsMode = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      printHelp();
      return;
    }
    if (arg === "-v" || arg === "--version") {
      console.log(getVersion());
      return;
    }
    if (arg === "--json") {
      jsonMode = true;
      continue;
    }
    if (arg === "-u" || arg === "--unique") {
      uniqueOnly = true;
      continue;
    }
    if (arg === "-p" || arg === "--ports") {
      portsMode = true;
      continue;
    }
    if (arg === "-d" || arg === "--domain" || arg === "--host") {
      i++;
      if (i < args.length) {
        targetDomain = args[i];
      } else {
        console.error("Error: --domain requires a host argument (e.g. -d sub.domain.com)");
        process.exit(1);
      }
      continue;
    }

    if (!arg.startsWith("-")) {
      // Determine whether argument is a file path or a domain shorthand
      if (arg.endsWith(".json") || arg.includes("/") || arg.includes("\\") || existsSync(resolve(process.cwd(), arg))) {
        filePath = arg;
      } else if (!targetDomain) {
        targetDomain = arg;
      } else if (!filePath) {
        filePath = arg;
      }
    } else {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  const targetPath = filePath || "./caddy.json";
  const resolvedPath = resolve(process.cwd(), targetPath);

  if (!existsSync(resolvedPath)) {
    console.error(`\nError: Caddy JSON file not found at: ${resolvedPath}\n`);
    console.error("Please provide a valid caddy.json path:");
    console.error("  npx caddy-cli [options] [path/to/caddy.json]\n");
    process.exit(1);
  }

  try {
    // Mode 1: Unique Hostnames only (-u / --unique)
    if (uniqueOnly) {
      const result = extractHostsFromFile(resolvedPath);
      if (jsonMode) {
        console.log(JSON.stringify(result.uniqueHosts, null, 2));
      } else {
        result.uniqueHosts.forEach((host) => console.log(host));
      }
      return;
    }

    // Mode 2: Specific Domain Inspection (-d / --domain <host>)
    if (targetDomain) {
      const match = findRouteByHostFromFile(resolvedPath, targetDomain);

      if (!match) {
        const allRoutes = inspectRoutesFromFile(resolvedPath);
        const available = [...new Set(allRoutes.flatMap((r) => r.hosts))];
        console.error(`\nError: Domain '${targetDomain}' was not found in Caddy configuration.`);
        console.error(`\nAvailable subdomains (${available.length}):`);
        available.forEach((h) => console.error(`  - ${h}`));
        console.error("");
        process.exit(1);
      }

      if (jsonMode) {
        console.log(JSON.stringify(match.rawRoute, null, 2));
        return;
      }

      console.log(`\n======================================================`);
      console.log(` Caddy Route Configuration: ${targetDomain}`);
      console.log(` Server: ${match.server} | Route Index: ${match.routeIndex}`);
      console.log(` Hostnames: ${match.hosts.join(", ")}`);
      console.log(`======================================================\n`);

      const summaryTable = match.targets.map((t) => ({
        Type: t.type,
        Path: t.path,
        Target: t.dials.length ? t.dials.join(", ") : t.root || "(default)"
      }));
      console.table(summaryTable);

      console.log("\nRaw Route JSON Definition:\n");
      console.log(JSON.stringify(match.rawRoute, null, 2));
      return;
    }

    // Mode 3: Port and Upstream Dial Mappings (-p / --ports)
    if (portsMode) {
      const mappings = getPortMappingsFromFile(resolvedPath);

      if (jsonMode) {
        console.log(JSON.stringify(mappings, null, 2));
        return;
      }

      console.log(`\nCaddy Upstream Ports & Reverse Proxy Mappings (${mappings.length}):\n`);
      const table = mappings.map((m) => ({
        Port: m.port,
        "Dial Target": m.dial,
        Type: m.type,
        Path: m.path,
        "Host(s)": m.hosts.join(", ")
      }));
      console.table(table);
      return;
    }

    // Mode 4: Default Overview (Subdomains + Target Ports + Handlers)
    const routes = inspectRoutesFromFile(resolvedPath);

    if (jsonMode) {
      console.log(JSON.stringify(routes, null, 2));
      return;
    }

    const overviewRows = [];
    routes.forEach((r) => {
      r.hosts.forEach((host) => {
        if (r.targets.length === 0) {
          overviewRows.push({
            Host: host,
            Type: "(no handler)",
            "Upstream / Target": "-",
            Path: "*"
          });
        } else {
          r.targets.forEach((t) => {
            overviewRows.push({
              Host: host,
              Type: t.type,
              "Upstream / Target": t.dials.length ? t.dials.join(", ") : t.root || "(default)",
              Path: t.path
            });
          });
        }
      });
    });

    const uniqueCount = new Set(routes.flatMap((r) => r.hosts)).size;

    console.log(`\nCaddy Subdomains & Reverse Proxy Routes (${uniqueCount} unique domains):\n`);
    console.table(overviewRows);

    console.log(`\nTip: Run 'npx caddy-cli -p' for port mappings, or 'npx caddy-cli -d <subdomain>' to inspect a specific route.\n`);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

export default run;

